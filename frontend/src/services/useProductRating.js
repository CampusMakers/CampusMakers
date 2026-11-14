import { useCallback, useEffect, useState } from "react";
import { previewStore } from "./previewStore";

export function useProductRating(productId, viewerId) {
    const [summary, setSummary] = useState({ average: null, count: 0, ownRating: null });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        if (!previewStore) throw new Error("Ratings are unavailable.");
        const { data, error: failure } = await previewStore.rpc("maker_product_rating_summary", { p_product_id: productId }).single();
        if (failure) throw failure;
        return { average: data.average_rating, count: Number(data.rating_count), ownRating: data.own_rating };
    }, [productId]);

    useEffect(() => {
        let active = true;
        load().then(result => {
            if (active) { setSummary(result); setLoadError(""); setLoading(false); }
        }).catch(() => {
            if (active) { setLoadError("Ratings could not be loaded. Please try again later."); setLoading(false); }
        });
        return () => { active = false; };
    }, [load, viewerId]);

    const submitRating = async (stars) => {
        if (!previewStore || !viewerId || busy || !Number.isInteger(stars) || stars < 1 || stars > 5) return false;
        setBusy(true);
        setError("");
        try {
            const { error: failure } = await previewStore.from("maker_product_ratings").upsert(
                { product_id: productId, user_id: viewerId, rating: stars },
                { onConflict: "product_id,user_id" }
            );
            if (failure) throw failure;
            try {
                setSummary(await load());
                setLoadError("");
            } catch {
                setSummary(current => ({ ...current, ownRating: stars }));
                setLoadError("Your rating was saved, but the average could not be refreshed.");
            }
            return true;
        } catch {
            setError("Your rating could not be saved. Please try again.");
            return false;
        } finally {
            setBusy(false);
        }
    };

    return { ...summary, loading, busy, loadError, error, submitRating };
}
