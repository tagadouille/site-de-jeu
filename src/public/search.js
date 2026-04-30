$(document).ready(function () {

    let timer;

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

    // A chaque caractère entré on envoie au server le contenu de la barre
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

function get_image(game_name) {
    return "/game-images/" + game_name.toLowerCase().replace(/\s+/g, '_') + ".jpg";
}

function get_div(game) {
    return `<a href="/games/${game.name.toLowerCase().replace(/\s+/g, '')}">` +

        `<div class = "search-game rounded m-1 p-2">` +
            `<h5><strong>${game.name}</strong></h5>` +
            `<img src="${get_image(game.name)}" alt="${get_image(game.name)}" class = "search-image img-thumbnail"></img>` +
        "</div>" +

    "</a>";
}