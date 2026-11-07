import { apiRequest } from './api';

export async function uploadPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Choose a JPEG, PNG, or WebP picture.');
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('Pictures must be 5 MB or smaller.');
    const result = await apiRequest('/photos', {
        method: 'POST', headers: { 'Content-Type': file.type }, body: file
    });
    return result.data.url;
}
