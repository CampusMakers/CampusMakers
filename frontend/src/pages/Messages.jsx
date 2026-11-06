import { useEffect, useState } from "react";
import { getConversations } from "../services/messagesApi";
import { searchUsers } from "../services/usersApi";
import "./Messages.css";

// Display readable dates for recent conversations.
function formatMessageTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    const daysAgo = Math.floor(
        (now.getTime() - date.getTime()) / 86400000
    );

    if (daysAgo >= 0 && daysAgo < 7) {
        return date.toLocaleDateString([], {
            weekday: "short"
        });
    }

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric"
    });
}

export default function Messages({
    onBack,
    onOpenConversation
}) {
    // Inbox state
    const [conversations, setConversations] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshCount, setRefreshCount] = useState(0);

    // New Message state
    const [showNewMessage, setShowNewMessage] = useState(false);
    const [recipient, setRecipient] = useState("");
    const [recipientError, setRecipientError] = useState("");

    // Live user search state
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [userSearchError, setUserSearchError] = useState("");

    // Load the signed-in user's conversations.
    useEffect(() => {
        let cancelled = false;

        const loadMessages = async () => {
            setLoading(true);
            setError("");

            try {
                const result = await getConversations();

                if (cancelled) return;

                setConversations(
                    Array.isArray(result)
                        ? result
                        : Array.isArray(result?.data)
                          ? result.data
                          : []
                );
            } catch (err) {
                if (cancelled) return;

                setError(
                    err.message ||
                        "Unable to load conversations."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadMessages();

        return () => {
            cancelled = true;
        };
    }, [refreshCount]);

    // LIVE USER SEARCH
    // Search registered users as someone types.
    useEffect(() => {
        const query = recipient.trim().replace(/^@/, "");

        // Clear suggestions when the form is closed
        // or the search field is empty.
        if (!showNewMessage || !query) {
            setSuggestedUsers([]);
            setSearchingUsers(false);
            setUserSearchError("");
            return;
        }

        const controller = new AbortController();

        setSearchingUsers(true);
        setUserSearchError("");
        setSuggestedUsers([]);

        // Debounce search requests by 300ms.
        const timer = setTimeout(async () => {
            try {
                const users = await searchUsers(
                    query,
                    controller.signal
                );

                if (controller.signal.aborted) return;

                setSuggestedUsers(
                    users.filter((user) => user?.username)
                );
            } catch {
                if (controller.signal.aborted) return;

                setSuggestedUsers([]);

                setUserSearchError(
                    "Unable to load suggestions. " +
                        "You can still enter an exact username."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setSearchingUsers(false);
                }
            }
        }, 300);

        // Cancel outdated searches when the user types again.
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [recipient, showNewMessage]);

    // Search existing conversations by name or username.
    const filteredConversations = conversations.filter(
        (conversation) => {
            const partner = conversation.partner || {};

            const searchable = [partner.name, partner.username]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
                search.trim().toLowerCase()
            );
        }
    );

    // Start a new conversation using an exact username.
    const startConversation = (event) => {
        event.preventDefault();

        const username = recipient
            .trim()
            .replace(/^@/, "")
            .toLowerCase();

        if (!username || !/^[a-z0-9._-]+$/.test(username)) {
            setRecipientError("Enter a valid username.");
            return;
        }

        setRecipientError("");
        onOpenConversation(username);
    };

    // Open a conversation from a suggested user.
    const selectSuggestedUser = (user) => {
        if (!user?.username) return;

        setRecipientError("");
        onOpenConversation(user.id);
    };

    // Count unread messages.
    const totalUnread = conversations.reduce(
        (total, conversation) =>
            total + (Number(conversation.unreadCount) || 0),
        0
    );

    return (
        <section
            className="messages-page"
            aria-labelledby="messages-heading">
            {/* HEADER */}
            <header className="messages-header">
                <button
                    type="button"
                    className="messages-back"
                    aria-label="Back to Profile"
                    onClick={onBack}>
                    ←
                </button>

                <div className="messages-header-title">
                    <h2 id="messages-heading">Messages</h2>
                    <p>Your Campus Makers conversations</p>
                </div>

                <button
                    type="button"
                    className="messages-refresh"
                    aria-label="Refresh messages"
                    title="Refresh messages"
                    onClick={() =>
                        setRefreshCount((count) => count + 1)
                    }
                    disabled={loading}>
                    ↻
                </button>
            </header>

            {/* INBOX SUMMARY */}
            <div className="messages-summary">
                <h3>Inbox</h3>

                {totalUnread > 0 && (
                    <span className="messages-unread-total">
                        {totalUnread} unread
                    </span>
                )}
            </div>

            {/* START NEW CONVERSATION */}
            <button
                type="button"
                className="messages-new-button"
                aria-expanded={showNewMessage}
                onClick={() => {
                    setShowNewMessage((current) => !current);
                    setRecipientError("");
                }}>
                {showNewMessage
                    ? "− Close New Message"
                    : "+ New Message"}
            </button>

            {/* NEW MESSAGE SEARCH FORM */}
            {showNewMessage && (
                <form
                    className="messages-new-form"
                    onSubmit={startConversation}>
                    <label htmlFor="messages-recipient">
                        Who would you like to message? Buyers can message sellers; sellers can message anyone.
                    </label>

                    <div className="messages-user-search">
                        <span aria-hidden="true">⌕</span>

                        <input
                            id="messages-recipient"
                            type="search"
                            value={recipient}
                            onChange={(event) => {
                                setRecipient(
                                    event.target.value
                                );
                                setRecipientError("");
                            }}
                            placeholder="Search name or @username"
                            aria-label="Search users"
                            autoCapitalize="none"
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>

                    {/* LIVE USER SUGGESTIONS */}
                    {recipient.trim() && (
                        <div
                            className="messages-suggestions"
                            aria-live="polite">
                            {/* SEARCHING */}
                            {searchingUsers && (
                                <p className="messages-search-status">
                                    Searching users...
                                </p>
                            )}

                            {/* SEARCH UNAVAILABLE */}
                            {!searchingUsers &&
                                userSearchError && (
                                    <p className="messages-search-status">
                                        {userSearchError}
                                    </p>
                                )}

                            {/* NO MATCHES */}
                            {!searchingUsers &&
                                !userSearchError &&
                                suggestedUsers.length === 0 && (
                                    <p className="messages-search-status">
                                        No matching users found.
                                    </p>
                                )}

                            {/* MATCHING USERS */}
                            {!searchingUsers &&
                                suggestedUsers.map((user) => {
                                    const displayName =
                                        user.name ||
                                        user.username;

                                    return (
                                        <button
                                            key={
                                                user.id ??
                                                user.username
                                            }
                                            type="button"
                                            className="messages-suggestion-item"
                                            onClick={() =>
                                                selectSuggestedUser(
                                                    user
                                                )
                                            }
                                            aria-label={`Message ${displayName}`}>
                                            {/* USER AVATAR */}
                                            <span className="messages-suggestion-avatar">
                                                {user.image ? (
                                                    <img
                                                        src={
                                                            user.image
                                                        }
                                                        alt=""
                                                    />
                                                ) : (
                                                    displayName
                                                        .charAt(
                                                            0
                                                        )
                                                        .toUpperCase()
                                                )}
                                            </span>

                                            {/* USER INFORMATION */}
                                            <span className="messages-suggestion-info">
                                                <strong>
                                                    {
                                                        displayName
                                                    }
                                                </strong>

                                                <small>
                                                    @
                                                    {
                                                        user.username
                                                    }
                                                </small>
                                            </span>

                                            <span aria-hidden="true">
                                                ›
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    )}

                    {/* USERNAME VALIDATION */}
                    {recipientError && (
                        <p role="alert">{recipientError}</p>
                    )}

                    {/* MANUAL USERNAME OPTION */}
                    <button
                        type="submit"
                        className="messages-open-conversation"
                        disabled={!recipient.trim()}>
                        Open Conversation →
                    </button>
                </form>
            )}

            {/* SEARCH EXISTING CONVERSATIONS */}
            <div className="messages-search">
                <span aria-hidden="true">⌕</span>

                <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                    placeholder="Search conversations"
                    aria-label="Search conversations"
                />
            </div>

            {/* LOADING */}
            {loading && (
                <div
                    className="messages-feedback"
                    role="status">
                    <p>Loading conversations...</p>
                </div>
            )}

            {/* ERROR */}
            {!loading && error && (
                <div className="messages-feedback" role="alert">
                    <h3>Couldn't load messages</h3>

                    <p>{error}</p>

                    <button
                        type="button"
                        className="messages-retry"
                        onClick={() =>
                            setRefreshCount(
                                (count) => count + 1
                            )
                        }>
                        Try Again
                    </button>
                </div>
            )}

            {/* EMPTY INBOX */}
            {!loading &&
                !error &&
                conversations.length === 0 && (
                    <div className="messages-feedback">
                        <div
                            className="messages-empty-icon"
                            aria-hidden="true">
                            ✉
                        </div>

                        <h3>No messages yet</h3>

                        <p>
                            When you connect with another Campus
                            Maker, your conversations will
                            appear here.
                        </p>
                    </div>
                )}

            {/* NO SEARCH RESULTS */}
            {!loading &&
                !error &&
                conversations.length > 0 &&
                filteredConversations.length === 0 && (
                    <div className="messages-feedback">
                        <h3>No conversations found</h3>

                        <p>
                            Try searching for another name or
                            username.
                        </p>
                    </div>
                )}

            {/* CONVERSATION LIST */}
            {!loading &&
                !error &&
                filteredConversations.length > 0 && (
                    <div className="messages-list">
                        {filteredConversations.map(
                            (conversation) => {
                                const partner =
                                    conversation.partner || {};

                                const lastMessage =
                                    conversation.lastMessage;

                                const unread =
                                    Number(
                                        conversation.unreadCount
                                    ) || 0;

                                const displayName =
                                    partner.name ||
                                    partner.username ||
                                    "Campus Maker";

                                const initial = displayName
                                    .charAt(0)
                                    .toUpperCase();

                                return (
                                    <button
                                        type="button"
                                        className={`messages-conversation ${
                                            unread > 0
                                                ? "messages-conversation-unread"
                                                : ""
                                        }`}
                                        key={
                                            partner.id ??
                                            partner.username
                                        }
                                        onClick={() =>
                                            onOpenConversation(
                                                partner.id
                                            )
                                        }
                                        aria-label={`Open conversation with ${displayName}`}>
                                        {/* PROFILE PICTURE */}
                                        <div className="messages-avatar">
                                            {partner.image ? (
                                                <img
                                                    src={
                                                        partner.image
                                                    }
                                                    alt=""
                                                />
                                            ) : (
                                                <span>
                                                    {initial}
                                                </span>
                                            )}
                                        </div>

                                        {/* MESSAGE INFORMATION */}
                                        <div className="messages-conversation-info">
                                            <div className="messages-conversation-top">
                                                <strong>
                                                    {
                                                        displayName
                                                    }
                                                </strong>

                                                <time
                                                    dateTime={
                                                        lastMessage?.createdAt ||
                                                        undefined
                                                    }>
                                                    {formatMessageTime(
                                                        lastMessage?.createdAt
                                                    )}
                                                </time>
                                            </div>

                                            <span className="messages-username">
                                                @
                                                {
                                                    partner.username
                                                }
                                            </span>

                                            <p className="messages-preview">
                                                {lastMessage?.content ||
                                                    "Start a conversation"}
                                            </p>
                                        </div>

                                        {/* UNREAD BADGE */}
                                        {unread > 0 && (
                                            <span
                                                className="messages-unread-badge"
                                                aria-label={`${unread} unread messages`}>
                                                {unread > 99
                                                    ? "99+"
                                                    : unread}
                                            </span>
                                        )}
                                    </button>
                                );
                            }
                        )}
                    </div>
                )}
        </section>
    );
}
