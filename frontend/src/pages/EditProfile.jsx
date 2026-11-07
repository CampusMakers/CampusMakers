import { useRef, useState } from "react";
import "./EditProfile.css";

import { uploadPhoto } from "../services/photos";

export default function EditProfile({
    profile,
    onBack,
    onSave
}) {
    const [form, setForm] = useState({ ...profile });
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const photoInputRef = useRef(null);
    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value
        }));
        setError("");
    };

    const handlePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError("");
        setUploading(true);

        try {
            const image = await uploadPhoto(file);
            updateField("image", image);
        } catch (error) {
            setError(error.message);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const name = form.name.trim();
        const username = form.username
            .trim()
            .replace(/^@/, "")
            .toLowerCase();
        const bio = form.bio.trim();

        if (!name || name.length > 80) {
            setError(
                "Display name must be between 1 and 80 characters."
            );
            return;
        }

        if (!/^[a-z0-9._]{3,30}$/.test(username)) {
            setError(
                "Username must be 3–30 characters: letters, numbers, periods, or underscores."
            );
            return;
        }

        if (bio.length > 500) {
            setError("Bio must be 500 characters or fewer.");
            return;
        }

        setUploading(true);
        try {
            await onSave({ name, username, bio, image: form.image });
        } catch (error) {
            setError(error.message || "Unable to save changes. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <section className="edit-profile-page">
            <button
                type="button"
                className="edit-profile-back"
                onClick={onBack}>
                ← Back to Profile
            </button>

            <div className="edit-profile-heading">
                <h2>Edit Profile</h2>
                <p>Make your Campus Makers profile your own.</p>
            </div>

            <form
                className="edit-profile-form"
                onSubmit={handleSubmit}>
                {/* PROFILE PICTURE EDITOR */}
                <div className="edit-profile-photo-section">
                    <div className="edit-profile-avatar-wrap">
                        <div className="edit-profile-avatar">
                            {form.image ? (
                                <img
                                    src={form.image}
                                    alt="Your profile preview"
                                />
                            ) : (
                                <span>
                                    {form.name
                                        ?.trim()
                                        .charAt(0)
                                        .toUpperCase() || "C"}
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            className="edit-profile-camera-button"
                            aria-label="Change profile picture"
                            onClick={() =>
                                photoInputRef.current?.click()
                            }
                            disabled={uploading}>
                            +
                        </button>
                    </div>

                    <input
                        ref={photoInputRef}
                        className="edit-profile-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        disabled={uploading}
                    />

                    <button
                        type="button"
                        className="edit-profile-change-link"
                        onClick={() =>
                            photoInputRef.current?.click()
                        }
                        disabled={uploading}>
                        {uploading
                            ? "Processing photo..."
                            : "Change photo"}
                    </button>

                    {form.image && (
                        <button
                            type="button"
                            className="edit-profile-remove"
                            onClick={() =>
                                updateField("image", "")
                            }>
                            Remove photo
                        </button>
                    )}
                </div>
                {/* DISPLAY NAME */}
                <div className="edit-profile-field">
                    <label htmlFor="edit-display-name">
                        Display Name
                    </label>
                    <input
                        id="edit-display-name"
                        type="text"
                        value={form.name}
                        maxLength={80}
                        onChange={(event) =>
                            updateField(
                                "name",
                                event.target.value
                            )
                        }
                        placeholder="Your name"
                        required
                    />
                </div>

                <div className="edit-profile-field">
                    <label htmlFor="edit-username">
                        Username
                    </label>

                    <div className="edit-profile-username-input">
                        <span>@</span>
                        <input
                            id="edit-username"
                            type="text"
                            value={form.username}
                            maxLength={30}
                            autoCapitalize="none"
                            spellCheck={false}
                            onChange={(event) =>
                                updateField(
                                    "username",
                                    event.target.value
                                )
                            }
                            placeholder="username"
                            required
                        />
                    </div>

                    <small>
                        This is how other Campus Makers users
                        will find you.
                    </small>
                </div>

                <div className="edit-profile-field">
                    <label htmlFor="edit-bio">Bio</label>
                    <textarea
                        id="edit-bio"
                        value={form.bio}
                        maxLength={500}
                        rows={4}
                        onChange={(event) =>
                            updateField(
                                "bio",
                                event.target.value
                            )
                        }
                        placeholder="Add bio"
                    />
                    <small>
                        {form.bio.length}/500 characters
                    </small>
                </div>

                {error && (
                    <p
                        className="edit-profile-error"
                        role="alert">
                        {error}
                    </p>
                )}

                <div className="edit-profile-actions">
                    <button
                        type="button"
                        className="edit-profile-cancel"
                        onClick={onBack}>
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="edit-profile-save"
                        disabled={uploading}>
                        {uploading
                            ? "Processing..."
                            : "Save Changes"}
                    </button>
                </div>

                <p className="edit-profile-demo-note">
                    Your profile is saved to your account. Pictures are stored in Cloudflare.
                </p>
            </form>
        </section>
    );
}
