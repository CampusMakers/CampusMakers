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

import { authFetch } from "./authApi";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(
    /\/$/,
    ""
);

export async function searchUsers(query, signal) {
    const search = query.trim().replace(/^@/, "");

    if (!search) {
        return [];
    }

    const params = new URLSearchParams({
        search,
        limit: "8"
    });

    const response = await authFetch(
        `${API_ORIGIN}/api/users?${params}`,
        { signal }
    );

    if (!response.ok) {
        throw new Error("User search is not available yet.");
    }

    const result = await response.json();

    return Array.isArray(result.data) ? result.data : [];
}
