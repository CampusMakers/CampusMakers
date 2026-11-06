/*
 * Campus Makers Messaging API
 *
 * Uses the backend's existing conversation and message routes.
 * All messaging endpoints require authentication.
 */

import { apiRequest } from './api';

// Get all conversations for the signed-in user.
export async function getConversations() {
    const result = await apiRequest("/conversations");
    return result.data;
}

// Get messages exchanged with a specific user.
export async function getConversation(username) {
    const result = await apiRequest(
        `/conversations/${encodeURIComponent(username)}?limit=50`
    );

    return result.data;
}

// Send a message to another user.
export async function sendMessage(username, content) {
    const result = await apiRequest("/messages", {
        method: "POST",
        body: JSON.stringify({
            recipientUsername: username,
            content: content.trim()
        })
    });

    return result.data;
}

// Mark messages from a user as read.
export async function markConversationRead(username) {
    await apiRequest(
        `/conversations/${encodeURIComponent(username)}/read`,
        {
            method: "PUT"
        }
    );
}

// Delete a message sent by the signed-in user.
export async function deleteMessage(messageId) {
    await apiRequest(
        `/messages/${encodeURIComponent(messageId)}`,
        {
            method: "DELETE"
        }
    );
}
