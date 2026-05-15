const renderedMessageIds = new Set();

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

        if (receiverId === null || receiverId === undefined) {
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

        // If sent successfully, check server once to sync both sides
        if (resp && resp.ok) {
            check_messages(senderId, matchId);
        }

        // Clear the input field :
        $("#message-write").val("");
    });

    // Receiving message :
    setInterval(async () => {

        check_messages(senderId, matchId);
    }, 500);

});

/**
 * The function checks for new messages for the given receiver ID by making 
 * an API call to fetch messages for the current match. If messages are found, 
 * it calls the add_message function to display them in the chat interface.
 * 
 * @param {*} myID - The ID of the current user, used to identify messages sent by the user.
 * @param {*} matchId - The ID of the current match, used to fetch messages related to that match.
 */
async function check_messages(myID, matchId) {

    try {
        const message_data = await fetch(`/api/message/${matchId}/status`);

        if (message_data.ok) {

            const response = await message_data.json();
            console.log(response);
            const mess_arr = response.messages || [];

            mess_arr.forEach(data => {
                add_message(data, myID);
            });
        }
    } catch (err) {
        console.error("Error occurred while fetching game status:", err);
    }
}

/**
 * The function adds a message to the chat interface,
 * determining the sender and styling accordingly.
 * @param {*} message_data - The data of the message, including sender and content.
 * @param {*} myId - The ID of the current user, used to determine message alignment.
 */
function add_message(message_data, myId) {

    const messageId = message_data.id;
    if (messageId !== undefined && messageId !== null) {
        const idStr = String(messageId);
        if (renderedMessageIds.has(idStr)) {
            return;
        }
        renderedMessageIds.add(idStr);
    }

    // compare as strings to avoid type mismatch between DOM data and server numbers
    const senderIdStr = String(message_data.sender);
    const myIdStr = String(myId);

    const user = senderIdStr === myIdStr ? "user2" : "user1";
    const displayName = message_data.sender_username || message_data.sender;

    $(".message-container").append(
        `<div class="message rounded ${user}">` +
        `<label><strong>${displayName}</strong></label>` +
        `<p>${message_data.message}</p>` +
        `</div>`
    );

    // Auto-scroll to bottom
    const container = $(".message-container");
    if (container.length > 0) {
        container.scrollTop(container[0].scrollHeight);
    }
}