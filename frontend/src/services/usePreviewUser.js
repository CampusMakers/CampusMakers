import { useEffect, useState } from 'react';
import { previewUser } from './previewStore';
export function usePreviewUser() {
    const [user, setUser] = useState(previewUser);
    useEffect(() => {
        const refresh = () => setUser(previewUser());
        window.addEventListener('campus-makers-preview', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener('campus-makers-preview', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);
    return { user, loading: false };
}
