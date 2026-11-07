/*
 * Campus Makers User Search
 Frontend service for finding registered users.
 Backend integration needed:
 GET /api/users?search=jare&limit=8
 * Expected response:
 * {
 *   data: [
 *     {
 *       id: "123",
 *       username: "jarek",
 *       name: "Jarek",
 *       image: null
 *     }
 *   ]
 * }
 */

import { apiRequest } from './api';

export async function searchUsers(query, signal) {
    const search = query.trim().replace(/^@/, '');
    if (!search) return [];
    const params = new URLSearchParams({ search, limit: '8' });
    const result = await apiRequest(`/users?${params}`, { signal });
    return Array.isArray(result.data) ? result.data : [];
}
