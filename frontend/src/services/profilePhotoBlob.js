// Edits use a resized data URL; the profile-photo dialog uses a File/Blob.
export function photoToBlob(photo) {
    if (photo instanceof Blob) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
            throw new Error("Choose a JPEG, PNG or WebP image.");
        }
        return photo;
    }
    if (typeof photo !== "string") throw new Error("Invalid profile image.");
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(photo);
    if (!match) throw new Error("Invalid profile image format.");
    const decoded = atob(match[2]);
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: match[1] });
}
