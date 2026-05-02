/**
 * Met à jour les statistiques d'un joueur pour un jeu.
 * API générique utilisable par plusieurs jeux.
 *
 * @param {object} pool - Pool PostgreSQL.
 * @param {string} game_name - Nom du jeu (stocké en base).
 * @param {number} userId - Identifiant du joueur.
 * @param {boolean} isWinner - Indique si le joueur a gagné la partie.
 */
export async function updatePlayerStats(pool, game_name, userId, isWinner) {

    const winsToAdd = isWinner ? 1 : 0;

    const query = `
        INSERT INTO played_games (user_id, game_name, number_of_wins, number_of_matches)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, game_name) 
        DO UPDATE SET 
            number_of_matches = played_games.number_of_matches + 1,
            number_of_wins = played_games.number_of_wins + $3
    `;
    await pool.query(query, [userId, game_name, winsToAdd]);
}

/**
 * Gère un forfait quand un joueur ne répond plus (générique).
 *
 * @param {object} pool - Pool PostgreSQL.
 * @param {object} game - Objet partie en mémoire.
 * @param {"player1"|"player2"} winnerKey - Clé logique représentant le gagnant.
 * @param {object} mapping - Objet décrivant les clés utilisées dans l'objet `game` et en BDD.
 * @param {string} game_name - Nom du jeu pour les stats en base.
 * @param {string} [displayMark] - Optionnel : marque à exposer côté client (ex: "X" ou "O").
 */
export async function handleDisconnect(pool, game, winnerKey, mapping, game_name, displayMark) {

    // Affecte un marqueur lisible côté front si fourni (ex: "X"/"O"), sinon stocke la clé logique.
    game.winner = typeof displayMark === 'string' ? displayMark : winnerKey;
    game.forfeit = true;

    try {
        // Récupère l'id du gagnant à partir du mapping fourni.
        const winnerId = game[mapping[winnerKey + 'IdKey']];

        await pool.query(
            `UPDATE live_matches SET status = 'finished', winner_id = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [winnerId, game.dbId]
        );

        // Met à jour les stats des deux joueurs (gagnant ou non).
        await updatePlayerStats(pool, game_name, game[mapping.player1IdKey], winnerKey === 'player1');
        await updatePlayerStats(pool, game_name, game[mapping.player2IdKey], winnerKey === 'player2');
    } catch (err) {
        console.error("Erreur BDD Forfait:", err);
    }
}

/**
 * Matchmaking générique : rejoint une partie existante ou en crée une nouvelle.
 *
 * @param {*} req
 * @param {*} res
 * @param {object} activeGames - Objet contenant les parties en mémoire.
 * @param {object} pool - Pool PostgreSQL.
 * @param {string} game_name - Nom du jeu pour la BDD (ex: "Tic Tac Toe").
 * @param {string} routeBase - Segment de route pour la redirection (ex: "tictactoe").
 * @param {object} mapping - Mapping des clés entre mémoire et BDD (voir doc).
 */
export async function match_making(req, res, activeGames, pool, game_name, routeBase, mapping) {

    if (!req.session || !req.session.user) {
        return res.redirect('/signin');
    }
    
    const username = req.session.user.username;
    const userId = req.session.user.id;
    let gameIdToJoin = null;

    for (const [id, game] of Object.entries(activeGames)) {

        // Si une partie attend un joueur2 et que ce n'est pas le même utilisateur
        if (game[mapping.player2Key] === null && game[mapping.player1Key] !== username) {
            gameIdToJoin = id;
            game[mapping.player2Key] = username;
            game[mapping.player2IdKey] = userId;
            game[mapping.lastPing2Key] = Date.now();

            try {
                const updateQuery = `UPDATE live_matches SET ${mapping.dbPlayer2Field} = $1 WHERE id = $2`;
                await pool.query(updateQuery, [userId, game.dbId]);
            }
            catch (err) {
                console.error("Erreur DB update match:", err);
            }
            break;
        }
        // Si le joueur a déjà créé la partie et attend le second joueur
        else if (game[mapping.player1Key] === username && game[mapping.player2Key] === null) {
            gameIdToJoin = id;
            game[mapping.lastPing2Key] = Date.now();
            break;
        }
    }

    // Aucune partie ouverte : on initialise une nouvelle entrée mémoire et BDD.
    if (!gameIdToJoin) {

        const new_game = {
            board: ["", "", "", "", "", "", "", "", ""],
            turn: "X",
            winner: null,
            forfeit: false,
        };

        // Ajout des champs dynamiquement selon le mapping fourni
        new_game[mapping.player1Key] = username;
        new_game[mapping.player1IdKey] = userId;
        new_game[mapping.player2Key] = null;
        new_game[mapping.player2IdKey] = null;
        new_game[mapping.lastPing1Key] = Date.now();
        new_game[mapping.lastPing2Key] = null;
        new_game.dbId = null;

        try {
            const insertQuery = `
                INSERT INTO live_matches (game_name, ${mapping.dbPlayer1Field}, status) 
                VALUES ($1, $2, 'ongoing') RETURNING id
            `;
            const dbRes = await pool.query(insertQuery, [game_name, userId]);
            // L'identifiant BDD servira aussi de clé mémoire si souhaité.
            gameIdToJoin = dbRes.rows[0].id;
            new_game.dbId = gameIdToJoin;
        } 
        catch (err) { 
            console.error("Erreur DB insert match:", err); 
        }

        activeGames[gameIdToJoin] = new_game;
    }

    res.redirect(`/games/${routeBase}/${gameIdToJoin}`);
}


/**
 * Nettoyage périodique des parties orphelines (générique).
 *
 * @param {object} activeGames - Objet contenant les parties en mémoire.
 * @param {object} pool - Pool PostgreSQL.
 * @param {object} mapping - Mapping des clés pour retrouver les pings et champs BDD.
 */
export function cleanup(activeGames, pool, mapping) {

    setInterval(async () => {

        const now = Date.now();
        const TIMEOUT = 10000; 

        for (const [id, game] of Object.entries(activeGames)) {

            const isPlayer1Gone = game[mapping.lastPing1Key] && (now - game[mapping.lastPing1Key] > TIMEOUT);
            const isPlayer2Gone = game[mapping.player1Key] === null || (game[mapping.lastPing2Key] && (now - game[mapping.lastPing2Key] > TIMEOUT));

            if (isPlayer1Gone && isPlayer2Gone) {
                
                if (game.winner === null && game.dbId) {
                    try {
                        await pool.query(
                            `UPDATE live_matches SET status = 'finished', ended_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'ongoing'`,
                            [game.dbId]
                        );
                    } catch (err) { 
                        console.error("Erreur nettoyage fantôme:", err); 
                    }
                }
                delete activeGames[id]; 
            }
        }
    }, 15000);
}
