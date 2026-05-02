$(document).ready(function () {

    // Recuperation of the metadata :
    const chat_data = $(".chat-data");

    const senderId = chat_data.data('sender-id');
    const receiverId = chat_data.data('receiver-id');
    const matchId = chat_data.data('match-id').substring(7);

    console.log(senderId, receiverId, matchId);

    // When the send message button clicked
    $("#send").click(async function () {

        // Recuperation of the message
        const message = $("#message-write").val().trim();

        if (message.length === 0) {
            return;
        }

        // Sending the message :
        await fetch('/api/message', {
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
                const mess_arr = response.messages || [];

                mess_arr.forEach(data => {
                    add_message(data);
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
function add_message(message_data) {

    let user = "user1";

    if (message_data.senderId !== receiverId && message_data.senderId === senderId) {
        user = "user2";
    }

    $(".message-container").append(
        `<div class="message rounded ${user}">` +
        `<label><strong>${message_data.sender}</strong></label>` +
        `<p>${message_data.message}</p>` +
        `</div>`
    );
}