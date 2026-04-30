/**
 * Function for get the image path of a game
 * @param {*} game_name the game name
 * @returns the image path
 */
export function get_image(game_name) {
    return "/game-images/" + game_name.toLowerCase().replace(/\s+/g, '_') + ".jpg";
}