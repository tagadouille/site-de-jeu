let timer;

$(document).ready(function () {

    // At each input, focus or click event on the search input, update the search popup with the search results
    $(document).on('input focus click', '.search-input', function () {
        const popup = $(this).closest('.search-container').find('.search-popup');
        updateSearchPopup($(this).val(), popup);
    });

    $(document).on('blur', '.search-input', function () {
        const popup = $(this).closest('.search-container').find('.search-popup');

        setTimeout(function () {
            popup.fadeOut(200);
        }, 150);
    });
});

/**
 * The function to update the search popup with the search results from the backend
 * @param {*} searchValue the value of the search input to search for
 * @param {*} popup the search popup element to update with the search results
 * @returns the search results to display in the search popup
 * 
 * @author Elias Dai
 */
async function updateSearchPopup(searchValue, popup) {
    const value = searchValue.trim();

    clearTimeout(timer);

    if (value.length === 0) {
        popup.fadeOut(200);
        popup.empty();
        return;
    }

    const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
    const data = await res.json();

    timer = setTimeout(function () {
        popup.empty();

        data.games.forEach(game => {
            popup.append(get_div(game));
        });

        popup.fadeIn(200);
    }, 200);
}

/**
 * The function to get the image path for a game based on its name
 * @param {*} game_name the name of the game to get the image for
 * @returns the path to the image for the game
 * 
 * @author Elias Dai
 */
function get_image(game_name) {
    return "/game-images/" + game_name.toLowerCase().replace(/\s+/g, '_') + ".jpg";
}

/**
 * The function to create the html div for a game in the search popup
 * @param {*} game the game object containing the name of the game
 * @returns the html div for the game in the search popup
 * 
 * @author Elias Dai
 */
function get_div(game) {
    return `<a href="/games/${game.name.toLowerCase().replace(/\s+/g, '')}">` +

        `<div class = "search-game rounded m-1 p-2">` +
        `<h5><strong>${game.name}</strong></h5>` +
        `<img src="${get_image(game.name)}" alt="${get_image(game.name)}" class = "search-image img-thumbnail"></img>` +
        "</div>" +

        "</a>";
}