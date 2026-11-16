import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
const empty = {
    profileId: null,
    following: [],
    followers: [],
    followingCount: 0,
    followerCount: 0,
    isFollowing: false,
    error: ""
};
export function useFollows(profileId, viewerId) {
    const [state, setState] = useState(empty),
        [busy, setBusy] = useState(false);
    const load = useCallback(
        async () =>
            profileId
                ? {
                      ...(await api(
                          `/users/by-id/${encodeURIComponent(profileId)}/connections`
                      )),
                      error: ""
                  }
                : empty,
        [profileId]
    );
    useEffect(() => {
        let active = true;
        load()
            .then((data) => {
                if (active) setState(data);
            })
            .catch((e) => {
                if (active)
                    setState({ ...empty, error: e.message });
            });
        return () => {
            active = false;
        };
    }, [load, viewerId]);
    async function toggleFollow() {
        if (
            !viewerId ||
            !state.username ||
            busy ||
            profileId === viewerId
        )
            return;
        setBusy(true);
        try {
            await api(
                `/follows/${encodeURIComponent(state.username)}`,
                { method: state.isFollowing ? "DELETE" : "PUT" }
            );
            setState(await load());
        } catch (e) {
            setState((s) => ({ ...s, error: e.message }));
        } finally {
            setBusy(false);
        }
    }
    return {
        ...state,
        ready: Boolean(
            profileId && state.profileId === profileId
        ),
        busy,
        toggleFollow
    };
}
