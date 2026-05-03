$(document).ready(function () {

    // Recuperation of the metadata :
    const chat_data = $(".chat-data");

    const senderId = chat_data.data('sender-id');
    const receiverId = chat_data.data('receiver-id');
    const matchId = String(chat_data.data('match-id') ?? '');

    console.log(senderId, receiverId, matchId);

    // When the send message button clicked
    $("#send").click(async function () {

        // Recuperation of the message
        const message = $("#message-write").val().trim();

        if (message.length === 0) {
            return;
        }

        if(receiverId === null || receiverId === undefined) {
            alert("Your opponent is not connected yet. Please wait.");
            return;
        }

        // Sending the message :
        const resp = await fetch('/api/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                {
                    senderId: senderId,
                    receiverId: receiverId,
                    matchId: matchId,
                    message: message
                }
            )
        });

        // If sent successfully, append locally so sender sees their message immediately
        if (resp && resp.ok) {
            add_message({ sender: senderId, message: message }, senderId, receiverId);
        }

        $("#message-write").val("");
    });

    // Receiving message :
    setInterval(async () => {

        if(receiverId === null) {
            return;
        }

        try {
            const message_data = await fetch(`/api/message/${matchId}/status`);

            if (message_data.ok) {

                const response = await message_data.json();
                console.log(response);
                const mess_arr = response.messages || [];

                mess_arr.forEach(data => {
                    add_message(data, senderId, receiverId);
                });
            }
        } catch (err) {
            console.error("Error occurred while fetching game status:", err);
        }
    }, 500);

});

/**
 * 
 * @param {*} message_data 
 */
function add_message(message_data, senderId, receiverId) {

    // compare as strings to avoid type mismatch between DOM data and server numbers
    const senderStr = String(message_data.sender);
    const myIdStr = String(senderId);

    const user = senderStr === myIdStr ? "user2" : "user1";

    $(".message-container").append(
        `<div class="message rounded ${user}">` +
        `<label><strong>${message_data.sender}</strong></label>` +
        `<p>${message_data.message}</p>` +
        `</div>`
    );
}