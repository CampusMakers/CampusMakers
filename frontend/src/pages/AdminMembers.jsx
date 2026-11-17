import { useEffect, useState } from "react";
import { api } from "../services/api";
import { AUTH_CHANGE_EVENT } from "../services/authApi";

export default function AdminMembers() {
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [version, setVersion] = useState(0);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        api(
            `/admin/members?search=${encodeURIComponent(search)}`,
            { signal: controller.signal }
        )
            .then((data) => {
                if (!controller.signal.aborted) {
                    setMembers(data);
                    setError("");
                }
            })
            .catch((e) => {
                if (!controller.signal.aborted)
                    setError(e.message);
            })
            .finally(() => {
                if (!controller.signal.aborted)
                    setLoading(false);
            });
        return () => controller.abort();
    }, [search, version]);
    async function changeRole(member) {
        const granting = member.role !== "admin";
        const label = member.username
            ? `@${member.username}`
            : member.name;
        if (
            !window.confirm(
                granting
                    ? `Make ${label} an administrator? They will be able to moderate content, publish announcements, and manage other admins.`
                    : `Remove administrator access from ${label}? Their buyer and seller access will stay unchanged.`
            )
        )
            return;
        setBusyId(member.id);
        setError("");
        setNotice("");
        try {
            const updated = await api(
                `/admin/members/${encodeURIComponent(member.id)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        role: granting ? "admin" : "user"
                    })
                }
            );
            setMembers((current) =>
                current.map((item) =>
                    item.id === updated.id ? updated : item
                )
            );
            setNotice(
                `${label} ${granting ? "is now an administrator" : "is no longer an administrator"}.`
            );
            window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusyId(null);
        }
    }
    return (
        <section aria-labelledby="manage-admins-heading">
            <h3 id="manage-admins-heading">
                Manage administrators
            </h3>
            <p>
                Search registered users by username or name.
                Only administrators can change these roles.
            </p>
            <form
                className="admin-member-search"
                onSubmit={(e) => {
                    e.preventDefault();
                    setSearch(query.trim());
                    setVersion((v) => v + 1);
                    setLoading(true);
                    setNotice("");
                }}>
                <label htmlFor="admin-member-query">
                    Find a registered user
                </label>
                <input
                    id="admin-member-query"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Username or name"
                    maxLength={100}
                />
                <div className="admin-actions">
                    <button disabled={busyId !== null}>
                        Search
                    </button>
                    <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                            setQuery("");
                            setSearch("");
                            setVersion((v) => v + 1);
                            setLoading(true);
                        }}>
                        Show current admins
                    </button>
                </div>
            </form>
            {loading && <p role="status">Loading accounts…</p>}
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            {!loading && !error && !members.length && (
                <p>No matching registered users.</p>
            )}
            {!loading &&
                members.map((member) => (
                    <article
                        key={member.id}
                        className="admin-member">
                        <div>
                            <strong>{member.name}</strong>
                            <p>
                                {member.username
                                    ? `@${member.username}`
                                    : "No username"}{" "}
                                ·{" "}
                                {member.role === "admin"
                                    ? "Administrator"
                                    : "Member"}
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => changeRole(member)}>
                            {busyId === member.id
                                ? "Saving…"
                                : member.role === "admin"
                                  ? "Remove admin access"
                                  : "Make admin"}
                        </button>
                    </article>
                ))}
        </section>
    );
}
