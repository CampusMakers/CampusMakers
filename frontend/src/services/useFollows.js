import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useFollows(profileId, viewerId) {
    const [state, setState] = useState({ profileId: null, following: [], followers: [], followingCount: 0, followerCount: 0, isFollowing: false, error: "" });
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!supabase || !profileId) return;
        const [followingResult, followersResult, followingCountResult, followerCountResult, viewerResult] = await Promise.all([
            supabase.from("maker_follows").select("followee_id, followee:messaging_profiles!maker_follows_followee_id_fkey(id, username, name)").eq("follower_id", profileId),
            supabase.from("maker_follows").select("follower_id, follower:messaging_profiles!maker_follows_follower_id_fkey(id, username, name)").eq("followee_id", profileId),
            supabase.from("maker_follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", profileId),
            supabase.from("maker_follows").select("followee_id", { count: "exact", head: true }).eq("followee_id", profileId),
            viewerId ? supabase.from("maker_follows").select("follower_id").eq("follower_id", viewerId).eq("followee_id", profileId).maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);
        const failure = [followingResult, followersResult, followingCountResult, followerCountResult, viewerResult].find(result => result.error)?.error;
        if (failure) throw failure;
        return {
            profileId,
            following: followingResult.data.map(row => row.followee).filter(Boolean),
            followers: followersResult.data.map(row => row.follower).filter(Boolean),
            followingCount: followingCountResult.count,
            followerCount: followerCountResult.count,
            isFollowing: Boolean(viewerResult.data),
            error: ""
        };
    }, [profileId, viewerId]);

    useEffect(() => {
        let active = true;
        load().then(result => { if (active && result) setState(result); }).catch(() => {
            if (active) setState({ profileId, following: [], followers: [], followingCount: 0, followerCount: 0, isFollowing: false, error: "Follow information could not be loaded." });
        });
        return () => { active = false; };
    }, [load, profileId]);

    const toggleFollow = async () => {
        if (!supabase || !profileId || !viewerId || profileId === viewerId || busy || state.profileId !== profileId) return;
        setBusy(true);
        try {
            const result = state.isFollowing
                ? await supabase.from("maker_follows").delete().eq("follower_id", viewerId).eq("followee_id", profileId)
                : await supabase.from("maker_follows").insert({ follower_id: viewerId, followee_id: profileId });
            if (result.error) throw result.error;
            const next = await load();
            if (next) setState(next);
        } catch {
            setState(current => ({ ...current, error: "Could not update follow status. Please try again." }));
        } finally { setBusy(false); }
    };

    return { ...state, ready: Boolean(profileId && state.profileId === profileId), busy, toggleFollow };
}
