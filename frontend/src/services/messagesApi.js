/*
 * Campus Makers Messaging API
 *
 * Uses the backend's existing conversation and message routes.
 * All messaging endpoints require authentication.
 */

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(
    /\/$/,
    ""
);

// Shared helper for backend requests.
async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_ORIGIN}/api${path}`, {
        credentials: "include",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    // Some endpoints return 204 with no response body.
    if (response.status === 204) {
        return null;
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            result?.error?.message ||
                result?.message ||
                `Request failed (${response.status})`
        );
    }

    return result;
}

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
