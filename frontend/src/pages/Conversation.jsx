import { useEffect, useRef, useState } from "react";
import {
    getConversation,
    sendMessage,
    markConversationRead,
    deleteMessage
} from "../services/messagesApi";

import "./Conversation.css";

function formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

export default function Conversation({ username, onBack }) {
    const [partner, setPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [refreshCount, setRefreshCount] = useState(0);
    const [deletingId, setDeletingId] = useState(null);

    const bottomRef = useRef(null);

    // Load messages exchanged with this user.
    useEffect(() => {
        let cancelled = false;

        async function loadConversation(background = false) {
            if (!background) setLoading(true);
            setError("");

            try {
                const result = await getConversation(username);

                if (cancelled) return;

                setPartner(result.partner);
                setMessages(result.messages || []);

                // Mark received messages as read.
                // A read-status failure should not prevent
                // the conversation from displaying.
                markConversationRead(username).catch(() => {});
            } catch (err) {
                if (cancelled) return;

                setError(
                    err.message ||
                        "Unable to load this conversation."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        if (username) {
            loadConversation();
        } else {
            setLoading(false);
            setError("No conversation was selected.");
        }

        const poll = window.setInterval(
            () => loadConversation(true),
            5000
        );

        return () => {
            cancelled = true;
            window.clearInterval(poll);
        };
    }, [username, refreshCount]);

    // Scroll to the newest message.
    useEffect(() => {
        if (!loading) {
            bottomRef.current?.scrollIntoView({
                block: "nearest"
            });
        }
    }, [messages, loading]);

    const handleSend = async (event) => {
        event.preventDefault();

        const content = draft.trim();

        if (!content || sending) return;

        if (content.length > 4000) {
            setActionError(
                "Messages must be 4,000 characters or fewer."
            );
            return;
        }

        setSending(true);
        setActionError("");

        try {
            const newMessage = await sendMessage(
                username,
                content
            );

            setMessages((current) => [...current, newMessage]);

            setDraft("");
        } catch (err) {
            setActionError(
                err.message || "Unable to send message."
            );
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (messageId) => {
        const confirmed = window.confirm(
            "Delete this message?"
        );

        if (!confirmed) return;

        setDeletingId(messageId);
        setActionError("");

        try {
            await deleteMessage(messageId);

            setMessages((current) =>
                current.filter(
                    (message) => message.id !== messageId
                )
            );
        } catch (err) {
            setActionError(
                err.message || "Unable to delete message."
            );
        } finally {
            setDeletingId(null);
        }
    };

    const displayName =
        partner?.name ||
        partner?.username ||
        username ||
        "Campus Maker";

    return (
        <section className="conversation-page">
            {/* CONVERSATION HEADER */}
            <header className="conversation-header">
                <button
                    type="button"
                    className="conversation-back"
                    aria-label="Back to messages"
                    onClick={onBack}>
                    ←
                </button>

                <div className="conversation-avatar">
                    {partner?.image ? (
                        <img src={partner.image} alt="" />
                    ) : (
                        <span>
                            {displayName
                                .charAt(0)
                                .toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="conversation-user">
                    <h2>{displayName}</h2>
                    {partner?.username && (
                        <p>@{partner.username}</p>
                    )}
                </div>

                <button
                    type="button"
                    className="conversation-refresh"
                    aria-label="Refresh conversation"
                    title="Refresh conversation"
                    disabled={loading}
                    onClick={() =>
                        setRefreshCount((count) => count + 1)
                    }>
                    ↻
                </button>
            </header>

            {/* MESSAGE HISTORY */}
            <div
                className="conversation-thread"
                aria-label={`Messages with ${displayName}`}>
                {loading && (
                    <div
                        className="conversation-feedback"
                        role="status">
                        Loading messages...
                    </div>
                )}

                {!loading && error && (
                    <div
                        className="conversation-feedback"
                        role="alert">
                        <h3>Couldn't load conversation</h3>
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() =>
                                setRefreshCount(
                                    (count) => count + 1
                                )
                            }>
                            Try Again
                        </button>
                    </div>
                )}

                {!loading &&
                    !error &&
                    messages.length === 0 && (
                        <div className="conversation-feedback">
                            <div className="conversation-empty-icon">
                                ✉
                            </div>

                            <h3>Start a conversation</h3>
                            <p>
                                Send a message to {displayName}
                                to get started.
                            </p>
                        </div>
                    )}

                {!loading &&
                    !error &&
                    messages.map((message) => {
                        // The thread only contains messages
                        // between the current user and partner.
                        const isMine =
                            partner?.id != null &&
                            message.senderId != null &&
                            String(message.senderId) !==
                                String(partner.id);

                        return (
                            <div
                                key={message.id}
                                className={`conversation-message ${
                                    isMine
                                        ? "conversation-message-mine"
                                        : "conversation-message-theirs"
                                }`}>
                                <div className="conversation-bubble">
                                    <p>{message.content}</p>
                                </div>

                                <div className="conversation-message-meta">
                                    <time
                                        dateTime={
                                            message.createdAt ||
                                            undefined
                                        }>
                                        {formatTime(
                                            message.createdAt
                                        )}
                                    </time>

                                    {isMine && (
                                        <button
                                            type="button"
                                            className="conversation-delete"
                                            disabled={
                                                deletingId ===
                                                message.id
                                            }
                                            onClick={() =>
                                                handleDelete(
                                                    message.id
                                                )
                                            }>
                                            {deletingId ===
                                            message.id
                                                ? "Deleting..."
                                                : "Delete"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                <div ref={bottomRef} />
            </div>

            {/* MESSAGE ERROR */}
            {actionError && (
                <p
                    className="conversation-action-error"
                    role="alert">
                    {actionError}
                </p>
            )}

            {/* MESSAGE INPUT */}
            <form
                className="conversation-composer"
                onSubmit={handleSend}>
                <textarea
                    value={draft}
                    onChange={(event) =>
                        setDraft(event.target.value)
                    }
                    placeholder="Write a message..."
                    aria-label="Write a message"
                    rows={2}
                    maxLength={4000}
                    disabled={loading || Boolean(error)}
                />

                <button
                    type="submit"
                    disabled={
                        !draft.trim() ||
                        sending ||
                        loading ||
                        Boolean(error)
                    }
                    aria-label="Send message">
                    {sending ? "Sending..." : "Send →"}
                </button>
            </form>
        </section>
    );
}
