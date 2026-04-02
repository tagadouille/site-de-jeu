import crypto from 'crypto';

/**
 * Backend for the profile page
 * @param {*} server
 * @author Noa
 */
export function runProfile(server) {

    let app = server.app;
    let baseUrl = server.action;

    function hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    function verifyPassword(passwordAttempt, storedPassword) {
        const [salt, originalHash] = storedPassword.split(':');
        const attemptHash = crypto.scryptSync(passwordAttempt, salt, 64).toString('hex');
        return attemptHash === originalHash;
    }

    const defaultPasswordHash = hashPassword("admin123");

    const dummyUser = {
        username: "user123",
        email: "user123@example.com",
        firstname: "user",
        lastname: "123",
        status : "online",
        passwordHash: defaultPasswordHash
    };

    const allAvailableGames = [
        { id: "g1", name: "Game 1", image: "/favicon.ico", description: "Description of Game 1." },
        { id: "g2", name: "Game 2", image: "/favicon.ico", description: "Description of Game 2." },
        { id: "g3", name: "Game 3", image: "/favicon.ico", description: "Description of Game 3." },
        { id: "g4", name: "Game 4", image: "/favicon.ico", description: "Description of Game 4." }
    ];

    for (let index = 0; index < 10; index++) {
        allAvailableGames.push(
            { id: "g" + (index + 5), name: "Game " + (index + 5), image: "/favicon.ico", description: "Description of Game " + (index + 5) + "." }
        );
    }
    let dummyGames = [ allAvailableGames[0], allAvailableGames[1] ];

    app.get('/profile', (req, res) => {
        

        res.render("profile/profile.ejs", { 
            action: baseUrl, 
            user: dummyUser,
            games: dummyGames,
            allGames: allAvailableGames
        });

    });

    app.post('/profile', (req, res) => {

       const formType = req.body.formType;

        if (formType === 'updatePassword') {
            const currentPassword = req.body.currentPassword;
            const newPassword = req.body.newPassword;
            const confirmPassword = req.body.confirmPassword;
            console.log("Received password update request:", { currentPassword, newPassword, confirmPassword });
            
            if (newPassword !== confirmPassword) {
                console.log("Error: The new passwords do not match.");
                return res.redirect('/profile'); 
            }

            const isMatch = verifyPassword(currentPassword, dummyUser.passwordHash);
            
            if (!isMatch) {
                console.log("Error: The current password is incorrect.");
                return res.redirect('/profile');
            }

            const newHash = hashPassword(newPassword);

            dummyUser.passwordHash = newHash;
            console.log("Success: Password updated and hashed!");
        }
        else if (formType === 'updateStatus') {
            dummyUser.status = req.body.status;
            console.log("Success: Status updated:", dummyUser.status);
        } 
        else if (formType === 'updateGames') {
            let selected = req.body.selectedGames;
            if (!selected) {
                selected = []; 
            } 
            else if (!Array.isArray(selected)) {
                selected = [selected]; 
            }
            
            dummyGames = allAvailableGames.filter(game => selected.includes(game.id));
            console.log("Success: Game list updated.");
        }

        res.redirect('/profile');
    });
}