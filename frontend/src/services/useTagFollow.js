import { useCallback, useEffect, useState } from "react";
import { previewStore } from "./previewStore";

export function useTagFollow(tag, viewerId) {
    const [isFollowing, setIsFollowing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const normalizedTag = tag.trim().toLowerCase();

    const load = useCallback(async () => {
        if (!previewStore || !viewerId || !normalizedTag) return false;
        const { data, error: loadError } = await previewStore
            .from("maker_tag_follows")
            .select("tag_name")
            .eq("follower_id", viewerId)
            .eq("tag_name", normalizedTag)
            .maybeSingle();
        if (loadError) throw loadError;
        return Boolean(data);
    }, [normalizedTag, viewerId]);

    useEffect(() => {
        let active = true;
        load().then((following) => {
            if (active) {
                setIsFollowing(following);
                setError("");
            }
        }).catch(() => {
            if (active) {
                setIsFollowing(false);
                setError("Follow information could not be loaded.");
            }
        });
        return () => { active = false; };
    }, [load]);

    const toggleFollow = async () => {
        if (!previewStore || !viewerId || !normalizedTag || busy) return;
        setBusy(true);
        setError("");
        try {
            const result = isFollowing
                ? await previewStore.from("maker_tag_follows").delete().eq("follower_id", viewerId).eq("tag_name", normalizedTag)
                : await previewStore.from("maker_tag_follows").insert({ follower_id: viewerId, tag_name: normalizedTag });
            if (result.error) throw result.error;
            setIsFollowing((following) => !following);
        } catch {
            setError("Could not update follow status. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return { isFollowing, busy, error, toggleFollow };
}
