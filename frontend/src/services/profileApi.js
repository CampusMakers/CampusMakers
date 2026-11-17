import { photoToBlob } from "./profilePhotoBlob";
import { authFetch } from "./authApi";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Use the existing authenticated backend; never put R2 API keys in the browser.
async function readData(response, fallback) {
    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(result?.error?.message || result?.message || fallback);
    }
    if (!result?.data) throw new Error(fallback);
    return result.data;
}

export async function updateMyProfile(changes) {
    const response = await authFetch(`${API_ORIGIN}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes)
    });
    return readData(response, "Could not save your profile.");
}

export async function uploadProfilePhoto(photo) {
    const image = photoToBlob(photo);
    if (image.size > 10 * 1024 * 1024) {
        throw new Error("Profile picture must be smaller than 10 MB.");
    }

    const form = new FormData();
    form.append("file", image, "profile-photo.jpg");
    const response = await authFetch(`${API_ORIGIN}/api/uploads?kind=profile`, {
        method: "POST",
        body: form
    });
    const uploaded = await readData(response, "Could not upload your photo. Check R2 configuration.");
    // Profile pictures use our backend proxy; the R2 bucket stays private.
    if (!uploaded.url || !/^https?:\/\//.test(uploaded.url) ||
        !new URL(uploaded.url).pathname.startsWith("/api/uploads/profile-photos/")) {
        throw new Error("Profile image upload returned an unexpected URL.");
    }
    return uploaded.url;
}
