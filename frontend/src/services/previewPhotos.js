export function uploadPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(new Error('Choose a JPEG, PNG or WebP image.'));
    if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 2 MB for this browser preview.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
    });
}
