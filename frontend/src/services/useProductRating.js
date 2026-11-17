import { useEffect, useState } from "react";
import { api } from "./api";
export function useProductRating(productId, viewerId) {
    const id = String(productId).replace(/^listing-/, "");
    const real = /^\d+$/.test(id);
    const [summary, setSummary] = useState({
        average: null,
        count: 0,
        ownRating: null
    });
    const [loading, setLoading] = useState(true),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        if (!real) return;
        api(`/listings/${id}/activity`)
            .then((data) => {
                if (active) setSummary(data);
            })
            .catch((e) => {
                if (active) setError(e.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [id, real, viewerId]);
    async function submitRating(rating) {
        if (!real) {
            setError("Choose a published listing to rate.");
            return false;
        }
        if (!viewerId || busy) return false;
        setBusy(true);
        setError("");
        try {
            setSummary(
                await api(`/listings/${id}/activity/rating`, {
                    method: "PUT",
                    body: JSON.stringify({ rating })
                })
            );
            return true;
        } catch (e) {
            setError(e.message);
            return false;
        } finally {
            setBusy(false);
        }
    }
    return {
        ...summary,
        loading: real && loading,
        busy,
        error,
        submitRating
    };
}
