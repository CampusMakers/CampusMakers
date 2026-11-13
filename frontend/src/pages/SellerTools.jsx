import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { uploadPhoto } from "../services/photos";
import {
    deviceTimeZone,
    formatScheduledTime
} from "../services/dateTime";

function toLocalDateTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    )
        .toISOString()
        .slice(0, 16);
}

export function PostComposer({
    user,
    onPublished,
    onUpdated,
    onCancel,
    initialPost = null,
    listings = [],
    promotablePosts = []
}) {
    const isEditing = Boolean(initialPost);

    const creator =
        `@${user.username || user.email.split("@")[0]}`.toLowerCase();

    const existingListings = Array.isArray(
        initialPost?.event_listings
    )
        ? initialPost.event_listings
        : [];

    const [caption, setCaption] = useState(
        initialPost?.caption || ""
    );
    const [file, setFile] = useState(null);
    const [postType, setPostType] = useState(
        initialPost?.post_type || initialPost?.type || "text"
    );
    const [postKind, setPostKind] = useState(
        initialPost?.is_event ? "event" : "post"
    );
    const [videoUrl, setVideoUrl] = useState(
        (initialPost?.post_type || initialPost?.type) ===
            "video"
            ? initialPost?.image || ""
            : ""
    );

    const [eventTitle, setEventTitle] = useState(
        initialPost?.event_title || ""
    );
    const [eventLocation, setEventLocation] = useState(
        initialPost?.event_location || ""
    );
    const [eventStartsAt, setEventStartsAt] = useState(
        toLocalDateTime(initialPost?.event_starts_at)
    );
    const [eventEndsAt, setEventEndsAt] = useState(
        toLocalDateTime(initialPost?.event_ends_at)
    );
    const [eventStatusMode, setEventStatusMode] = useState(
        initialPost?.event_status_mode || "manual"
    );
    const [eventSlots, setEventSlots] = useState(
        Array.isArray(initialPost?.event_slots)
            ? initialPost.event_slots.join("\n")
            : ""
    );
    const [eventListingIds, setEventListingIds] = useState(
        existingListings.map((item) => String(item.id))
    );
    const [
        eventListingAvailability,
        setEventListingAvailability
    ] = useState(
        Object.fromEntries(
            existingListings.map((item) => [
                String(item.id),
                item.availability
            ])
        )
    );
    const [eventPostIds, setEventPostIds] = useState(
        (initialPost?.event_posts || []).map(String)
    );

    const [collaborator, setCollaborator] = useState("");
    const [collaborators, setCollaborators] = useState(
        (initialPost?.collaborators || []).filter(
            (username) => username !== creator
        )
    );
    const [profiles, setProfiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!supabase) return;
        let active = true;
        supabase
            .from("messaging_profiles")
            .select("username")
            .then(({ data }) => {
                if (active && data)
                    setProfiles(
                        data.map(
                            ({ username }) => `@${username}`
                        )
                    );
            });
        return () => {
            active = false;
        };
    }, []);

    function addCollaborator() {
        const username = collaborator
            .trim()
            .replace(/^@?/, "@")
            .toLowerCase();
        if (!username) return;
        if (
            username === creator ||
            collaborators.includes(username)
        ) {
            setError(
                "Each collaborator can only be included once."
            );
            return;
        }
        if (profiles.length && !profiles.includes(username)) {
            setError(
                "Choose an existing Campus Makers account."
            );
            return;
        }
        if (collaborators.length >= 9) {
            setError(
                "A collaboration can include up to 10 accounts."
            );
            return;
        }
        setCollaborators((current) => [...current, username]);
        setCollaborator("");
        setError("");
    }

    async function publish(event) {
        event.preventDefault();
        if (busy || !caption.trim()) return;
        const mentions = [
            ...caption.matchAll(/(?:^|\s)@([a-z0-9._-]+)/gi)
        ].map(([, username]) => `@${username}`.toLowerCase());
        if (
            profiles.length &&
            mentions.some(
                (username) => !profiles.includes(username)
            )
        ) {
            setError(
                "Caption mentions must use existing Campus Makers accounts."
            );
            return;
        }
        if (postType === "video" && !videoUrl.trim()) {
            setError("Add a video URL for a video post.");
            return;
        }
        if (
            postKind === "event" &&
            (!eventTitle.trim() ||
                !eventLocation.trim() ||
                !eventStartsAt)
        ) {
            setError(
                "An event needs a name, location, and start time."
            );
            return;
        }
        if (
            postKind === "event" &&
            eventEndsAt &&
            new Date(eventEndsAt) <= new Date(eventStartsAt)
        ) {
            setError(
                "The event end time must be after its start time."
            );
            return;
        }
        if (
            postKind === "event" &&
            eventStatusMode === "automatic" &&
            (!eventEndsAt ||
                new Date(eventEndsAt) <= new Date())
        ) {
            setError(
                "Automatic status requires an event end time in the future."
            );
            return;
        }
        if (
            postKind === "event" &&
            eventListingIds.some(
                (id) => !eventListingAvailability[id]
            )
        ) {
            setError(
                "Choose availability for each linked listing."
            );
            return;
        }
        setBusy(true);
        setError("");
        try {
            if (!supabase)
                throw new Error(
                    "Please log in to publish a post."
                );
            const image =
                postType === "image"
                    ? file
                        ? await uploadPhoto(file)
                        : isEditing &&
                            (initialPost.post_type ||
                                initialPost.type) === "image"
                          ? initialPost.image
                          : null
                    : postType === "video"
                      ? videoUrl.trim()
                      : null;
            const selectedListings = listings
                .filter((item) =>
                    eventListingIds.includes(String(item.id))
                )
                .map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    price: Number(item.price) || 0,
                    image:
                        item.images?.[0] || item.image || null,
                    quantity: item.quantity,
                    maxPerOrder: item.maxPerOrder,
                    creator,
                    availability:
                        eventListingAvailability[
                            String(item.id)
                        ]
                }));

            const postData = {
                creator,
                caption: caption.trim(),
                image,
                post_type: postType,
                collaborators: collaborators.length
                    ? [creator, ...collaborators]
                    : [],
                is_event: postKind === "event",
                event_title:
                    postKind === "event"
                        ? eventTitle.trim()
                        : null,
                event_location:
                    postKind === "event"
                        ? eventLocation.trim()
                        : null,
                event_starts_at:
                    postKind === "event"
                        ? new Date(eventStartsAt).toISOString()
                        : null,
                event_ends_at:
                    postKind === "event" && eventEndsAt
                        ? new Date(eventEndsAt).toISOString()
                        : null,
                event_time_zone:
                    postKind === "event"
                        ? initialPost?.event_time_zone ||
                          deviceTimeZone()
                        : null,
                event_status_mode:
                    postKind === "event"
                        ? eventStatusMode
                        : "manual",
                event_listings:
                    postKind === "event"
                        ? selectedListings
                        : [],
                event_slots:
                    postKind === "event"
                        ? eventSlots
                              .split("\n")
                              .map((value) => value.trim())
                              .filter(Boolean)
                        : [],
                event_posts:
                    postKind === "event" ? eventPostIds : []
            };

            let result;

            if (isEditing) {
                const postId = String(initialPost.id).replace(
                    /^post-/,
                    ""
                );

                result = await supabase
                    .from("maker_posts")
                    .update(postData)
                    .eq("id", postId)
                    .eq("seller_id", user.id)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from("maker_posts")
                    .insert({
                        ...postData,
                        seller_id: user.id
                    })
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            if (isEditing) {
                onUpdated?.(result.data);
            } else {
                onPublished?.(result.data);
            }
        } catch (failure) {
            setError(
                `Could not ${isEditing ? "update" : "publish"} your post. ${failure.message}`
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="profile-panel seller-panel">
            <div className="profile-panel-heading">
                <h3>
                    {isEditing
                        ? postKind === "event"
                            ? "Edit Event"
                            : "Edit Post"
                        : postKind === "event"
                          ? "Create an event"
                          : "Create a post"}
                </h3>
            </div>
            <p className="seller-section-description">
                Share a text, photo, or video with the campus.
                Add 1–9 other accounts to make it a
                collaboration.
            </p>
            <form
                className="seller-tool-form"
                onSubmit={publish}>
                <label>
                    Publish as
                    <select
                        value={postKind}
                        onChange={(e) =>
                            setPostKind(e.target.value)
                        }>
                        <option value="post">Post</option>
                        <option value="event">
                            Event post
                        </option>
                    </select>
                </label>
                {postKind === "event" && (
                    <fieldset className="event-composer-details">
                        <legend>Event details</legend>
                        <label>
                            Event name
                            <input
                                required
                                maxLength={120}
                                value={eventTitle}
                                onChange={(e) =>
                                    setEventTitle(
                                        e.target.value
                                    )
                                }
                                placeholder="Spring Makers Market"
                            />
                        </label>
                        <label>
                            Location
                            <input
                                required
                                maxLength={200}
                                value={eventLocation}
                                onChange={(e) =>
                                    setEventLocation(
                                        e.target.value
                                    )
                                }
                                placeholder="Campus Union courtyard"
                            />
                        </label>
                        <div className="event-time-fields">
                            <label>
                                Starts
                                <input
                                    required
                                    type="datetime-local"
                                    value={eventStartsAt}
                                    onChange={(e) =>
                                        setEventStartsAt(
                                            e.target.value
                                        )
                                    }
                                />
                            </label>
                            <label>
                                Ends{" "}
                                <span>
                                    (
                                    {eventStatusMode ===
                                    "automatic"
                                        ? "required for automatic status"
                                        : "optional"}
                                    )
                                </span>
                                <input
                                    type="datetime-local"
                                    required={
                                        eventStatusMode ===
                                        "automatic"
                                    }
                                    value={eventEndsAt}
                                    onChange={(e) =>
                                        setEventEndsAt(
                                            e.target.value
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <p>
                            Event times use your device time
                            zone: {deviceTimeZone()}.
                        </p>
                        <label>
                            Status updates
                            <select
                                value={eventStatusMode}
                                onChange={(e) =>
                                    setEventStatusMode(
                                        e.target.value
                                    )
                                }>
                                <option value="manual">
                                    Manual
                                </option>
                                <option value="automatic">
                                    Automatic using event times
                                </option>
                            </select>
                        </label>
                        {eventStatusMode === "automatic" && (
                            <p>
                                At the end time, the event will
                                be marked Event Ended and can no
                                longer be edited.
                            </p>
                        )}
                        {listings.length > 0 && (
                            <div className="event-link-picker">
                                <strong>
                                    Listings{" "}
                                    <span>(optional)</span>
                                </strong>
                                {listings.map((item) => {
                                    const id = String(item.id);
                                    const selected =
                                        eventListingIds.includes(
                                            id
                                        );
                                    return (
                                        <div
                                            className="event-listing-option"
                                            key={id}>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selected
                                                    }
                                                    onChange={() =>
                                                        setEventListingIds(
                                                            (
                                                                current
                                                            ) =>
                                                                selected
                                                                    ? current.filter(
                                                                          (
                                                                              value
                                                                          ) =>
                                                                              value !==
                                                                              id
                                                                      )
                                                                    : [
                                                                          ...current,
                                                                          id
                                                                      ]
                                                        )
                                                    }
                                                />{" "}
                                                {item.name}
                                            </label>
                                            {selected && (
                                                <label className="event-listing-availability">
                                                    Availability
                                                    for{" "}
                                                    {item.name}
                                                    <select
                                                        required
                                                        value={
                                                            eventListingAvailability[
                                                                id
                                                            ] ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            setEventListingAvailability(
                                                                (
                                                                    current
                                                                ) => ({
                                                                    ...current,
                                                                    [id]: e
                                                                        .target
                                                                        .value
                                                                })
                                                            )
                                                        }>
                                                        <option value="">
                                                            Choose
                                                            availability
                                                        </option>
                                                        <option value="event">
                                                            Available
                                                            at
                                                            the
                                                            event
                                                        </option>
                                                        <option value="preorder">
                                                            Available
                                                            for
                                                            preorder
                                                        </option>
                                                        <option value="both">
                                                            Available
                                                            at
                                                            the
                                                            event
                                                            and
                                                            for
                                                            preorder
                                                        </option>
                                                    </select>
                                                </label>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <label>
                            Available appointment slots{" "}
                            <span>
                                (optional, one per line)
                            </span>
                            <textarea
                                value={eventSlots}
                                onChange={(e) =>
                                    setEventSlots(
                                        e.target.value
                                    )
                                }
                                placeholder={
                                    "Saturday, 10:00 AM\nSaturday, 10:30 AM"
                                }
                            />
                        </label>
                        {promotablePosts.length > 0 && (
                            <div className="event-link-picker">
                                <strong>
                                    Promotion posts{" "}
                                    <span>(optional)</span>
                                </strong>
                                {promotablePosts.map((item) => (
                                    <label key={item.id}>
                                        <input
                                            type="checkbox"
                                            checked={eventPostIds.includes(
                                                String(item.id)
                                            )}
                                            onChange={() =>
                                                setEventPostIds(
                                                    (
                                                        current
                                                    ) =>
                                                        current.includes(
                                                            String(
                                                                item.id
                                                            )
                                                        )
                                                            ? current.filter(
                                                                  (
                                                                      id
                                                                  ) =>
                                                                      id !==
                                                                      String(
                                                                          item.id
                                                                      )
                                                              )
                                                            : [
                                                                  ...current,
                                                                  String(
                                                                      item.id
                                                                  )
                                                              ]
                                                )
                                            }
                                        />{" "}
                                        {item.caption.slice(
                                            0,
                                            80
                                        )}
                                        {item.caption.length >
                                        80
                                            ? "..."
                                            : ""}
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>
                )}
                <label>
                    Post type
                    <select
                        value={postType}
                        onChange={(e) =>
                            setPostType(e.target.value)
                        }>
                        <option value="text">Text</option>
                        <option value="image">Photo</option>
                        <option value="video">Video</option>
                    </select>
                </label>
                <label>
                    Caption{" "}
                    <span>
                        (use @username to tag an account)
                    </span>
                    <textarea
                        required
                        maxLength={2000}
                        value={caption}
                        onChange={(e) =>
                            setCaption(e.target.value)
                        }
                    />
                </label>

                {postType === "image" && (
                    <>
                        <label>
                            Photo (optional)
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                    setFile(
                                        e.target.files?.[0] ||
                                            null
                                    )
                                }
                            />
                        </label>

                        {isEditing &&
                            initialPost?.image &&
                            !file && (
                                <p className="seller-section-description">
                                    Your current photo will be
                                    kept unless you upload a
                                    replacement.
                                </p>
                            )}
                    </>
                )}

                {postType === "video" && (
                    <label>
                        Video URL
                        <input
                            type="url"
                            required
                            placeholder="https://…"
                            value={videoUrl}
                            onChange={(e) =>
                                setVideoUrl(e.target.value)
                            }
                        />
                    </label>
                )}
                <fieldset className="post-collaborators">
                    <legend>
                        Collaborators{" "}
                        <span>
                            (optional, up to 10 accounts total)
                        </span>
                    </legend>
                    <p>
                        Adding a collaborator makes this a
                        shared post. Caption tags and
                        collaborators are independent: tagging
                        someone does not add them as a
                        collaborator, and collaborators do not
                        need to be tagged.
                    </p>
                    <div>
                        <input
                            list="campus-maker-profiles"
                            value={collaborator}
                            onChange={(e) =>
                                setCollaborator(e.target.value)
                            }
                            placeholder="@username"
                        />
                        <datalist id="campus-maker-profiles">
                            {profiles.map((username) => (
                                <option
                                    key={username}
                                    value={username}
                                />
                            ))}
                        </datalist>
                        <button
                            className="profile-action-button"
                            type="button"
                            onClick={addCollaborator}>
                            Add
                        </button>
                    </div>
                    {collaborators.length > 0 && (
                        <ul>
                            {[creator, ...collaborators].map(
                                (username) => (
                                    <li key={username}>
                                        {username}
                                        {username !==
                                            creator && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCollaborators(
                                                        (
                                                            current
                                                        ) =>
                                                            current.filter(
                                                                (
                                                                    item
                                                                ) =>
                                                                    item !==
                                                                    username
                                                            )
                                                    )
                                                }
                                                aria-label={`Remove ${username}`}>
                                                ×
                                            </button>
                                        )}
                                    </li>
                                )
                            )}
                        </ul>
                    )}
                </fieldset>
                {error && <p role="alert">{error}</p>}
                <div className="profile-appointment-actions">
                    <button
                        className="profile-action-button"
                        type="button"
                        disabled={busy}
                        onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="profile-action-button profile-action-primary"
                        disabled={busy || !caption.trim()}>
                        {busy
                            ? isEditing
                                ? "Saving…"
                                : "Publishing…"
                            : isEditing
                              ? "Save Changes"
                              : "Publish to Explore"}
                    </button>
                </div>
            </form>
        </section>
    );
}

export function AppointmentManager({ user }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let active = true;
        async function load() {
            try {
                if (!supabase)
                    throw new Error(
                        "Please log in to manage appointments."
                    );
                const { data, error: failure } = await supabase
                    .from("maker_appointments")
                    .select("*")
                    .eq("seller_id", user.id)
                    .order("starts_at");
                if (failure) throw failure;
                if (active) setItems(data);
            } catch (failure) {
                if (active)
                    setError(
                        `Could not load appointments. ${failure.message}`
                    );
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => {
            active = false;
        };
    }, [user.id]);
    async function save(event) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        const startsAt = new Date(fields.get("starts_at"));
        if (startsAt <= new Date()) {
            setError("Choose a future appointment time.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const { data, error: failure } = await supabase
                .from("maker_appointments")
                .insert({
                    seller_id: user.id,
                    title: fields.get("title").trim(),
                    buyer: fields.get("buyer").trim(),
                    location: fields.get("location").trim(),
                    starts_at: startsAt.toISOString(),
                    time_zone: deviceTimeZone()
                })
                .select()
                .single();
            if (failure) throw failure;
            setItems((current) =>
                [...current, data].sort((a, b) =>
                    a.starts_at.localeCompare(b.starts_at)
                )
            );
            form.reset();
        } catch (failure) {
            setError(
                `Could not save appointment. ${failure.message}`
            );
        } finally {
            setBusy(false);
        }
    }
    async function update(item, status) {
        setBusy(true);
        setError("");
        try {
            const { data, error: failure } = await supabase
                .from("maker_appointments")
                .update({ status })
                .eq("id", item.id)
                .eq("seller_id", user.id)
                .select()
                .single();
            if (failure) throw failure;
            setItems((current) =>
                current.map((row) =>
                    row.id === data.id ? data : row
                )
            );
        } catch (failure) {
            setError(
                `Could not update appointment. ${failure.message}`
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="profile-panel seller-panel">
            <div className="profile-panel-heading">
                <h3>Your appointments</h3>
                <span className="profile-count">
                    {loading || error ? "—" : items.length}{" "}
                    appointments
                </span>
            </div>
            <p className="seller-section-description">
                Keep track of your pickups and meetings. These
                entries are private to you.
            </p>
            <form className="seller-tool-form" onSubmit={save}>
                <label>
                    Appointment
                    <input
                        name="title"
                        required
                        maxLength={120}
                        placeholder="Custom order pickup"
                    />
                </label>
                <label>
                    Buyer
                    <input
                        name="buyer"
                        required
                        maxLength={120}
                        placeholder="Name or username"
                    />
                </label>
                <label>
                    Date and time
                    <input
                        name="starts_at"
                        type="datetime-local"
                        required
                    />
                </label>
                <p>
                    Appointment time uses your device time zone:{" "}
                    {deviceTimeZone()}.
                </p>
                <label>
                    Meeting location
                    <input
                        name="location"
                        required
                        maxLength={200}
                    />
                </label>
                <button
                    className="profile-action-button profile-action-primary"
                    disabled={busy || loading}>
                    {busy ? "Saving…" : "+ Add appointment"}
                </button>
            </form>
            {error && <p role="alert">{error}</p>}
            {loading ? (
                <p role="status">Loading appointments…</p>
            ) : !items.length && !error ? (
                <p className="seller-empty-state">
                    No appointments yet. Add your first one
                    above.
                </p>
            ) : null}
            <div className="profile-card-stack">
                {items.map((item) => (
                    <article
                        key={item.id}
                        className="profile-appointment-card">
                        <h4>{item.title}</h4>
                        <p>
                            {item.buyer} ·{" "}
                            {formatScheduledTime(
                                item.starts_at,
                                item.time_zone
                            )}
                        </p>
                        <p>{item.location}</p>
                        <span
                            className={`profile-status ${item.status === "Completed" ? "profile-status-confirmed" : item.status === "Scheduled" ? "profile-status-pending" : "seller-status-neutral"}`}>
                            {item.status}
                        </span>
                        {item.status === "Scheduled" && (
                            <div className="profile-appointment-actions">
                                <button
                                    className="profile-action-button"
                                    disabled={busy}
                                    onClick={() =>
                                        update(
                                            item,
                                            "Completed"
                                        )
                                    }>
                                    Mark completed
                                </button>
                                <button
                                    className="profile-action-button"
                                    disabled={busy}
                                    onClick={() =>
                                        update(
                                            item,
                                            "Cancelled"
                                        )
                                    }>
                                    Cancel appointment
                                </button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
