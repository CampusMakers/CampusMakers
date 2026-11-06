import { supabase } from './supabase';

const origin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function apiRequest(path, options = {}) {
    const { data, error } = supabase ? await supabase.auth.getSession() : { data: {} };
    if (error || !data.session) throw new Error('Please log in to continue.');
    const response = await fetch(`${origin}/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${data.session.access_token}` }
    });
    if (response.status === 204) return null;
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || `Request failed (${response.status})`);
    return result;
}
