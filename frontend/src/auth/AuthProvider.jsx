import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { apiRequest } from '../services/api';
import { AuthContext } from './useAuth';

export default function AuthProvider({ children }) {
    const [auth, setAuth] = useState({ user: null, loading: Boolean(supabase), error: supabase ? '' : 'Supabase is not configured.' });
    useEffect(() => {
        if (!supabase) return;
        let active = true;
        let revision = 0;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const current = ++revision;
            if (!session) {
                setAuth({ user: null, loading: false, error: '' });
                return;
            }
            setAuth({ user: null, loading: true, error: '' });
            // Run outside the Auth callback to avoid holding the SDK's session lock.
            setTimeout(async () => {
                try {
                    const result = await apiRequest('/auth/me');
                    if (active && current === revision) setAuth({ user: result.data, loading: false, error: '' });
                } catch (error) {
                    if (active && current === revision) setAuth({ user: null, loading: false, error: error.message });
                }
            }, 0);
        });
        return () => { active = false; subscription.unsubscribe(); };
    }, []);
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
