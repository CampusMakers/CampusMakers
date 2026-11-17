import { api } from "./api";
export async function uploadPhoto(file) {
    if (
        !["image/jpeg", "image/png", "image/webp"].includes(
            file.type
        )
    )
        throw new Error("Choose a JPEG, PNG or WebP image.");
    if (file.size > 10 * 1024 * 1024)
        throw new Error("Choose an image smaller than 10 MB.");
    const form = new FormData();
    form.append("file", file);
    return (
        await api("/uploads", { method: "POST", body: form })
    ).url;
}
