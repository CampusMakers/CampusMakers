import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "./Login.css";
import "./PasswordRecovery.css";

export default function PasswordRecovery({
    mode = "request",
    onBack
}) {
    const isUpdate = mode === "update";

    const [email, setEmail] = useState("");
    const [accountEmail, setAccountEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [busy, setBusy] = useState(false);
    const [checking, setChecking] = useState(isUpdate);
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isUpdate) return;

        let active = true;

        async function checkRecoverySession() {
            if (!supabase) {
                if (active) {
                    setError("Supabase is not configured.");
                    setChecking(false);
                }
                return;
            }

            try {
                const { data, error: sessionError } =
                    await supabase.auth.getUser();

                if (!active) return;

                if (sessionError || !data.user) {
                    setError(
                        "Your reset link is invalid or expired. " +
                            "Please request a new link."
                    );
                } else {
                    setAccountEmail(data.user.email || "");
                }
            } catch {
                if (active) {
                    setError(
                        "Unable to verify your reset link."
                    );
                }
            } finally {
                if (active) setChecking(false);
            }
        }

        checkRecoverySession();

        return () => {
            active = false;
        };
    }, [isUpdate]);

    const backToLogin = () => {
        if (isUpdate) {
            window.location.replace(
                `${window.location.origin}${window.location.pathname}#login`
            );
        } else {
            onBack?.();
        }
    };

    async function handleSubmit(event) {
        event.preventDefault();
        if (busy) return;

        setError("");
        setBusy(true);

        try {
            if (!supabase) {
                throw new Error("Supabase is not configured.");
            }

            if (!isUpdate) {
                const address = email.trim().toLowerCase();

                if (
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
                ) {
                    throw new Error(
                        "Enter a valid email address."
                    );
                }

                const redirectTo =
                    `${window.location.origin}` +
                    `${window.location.pathname}` +
                    "?reset_password=1";

                const { error: resetError } =
                    await supabase.auth.resetPasswordForEmail(
                        address,
                        { redirectTo }
                    );

                if (resetError) throw resetError;

                setComplete(true);
            } else {
                if (!accountEmail) {
                    throw new Error(
                        "No valid account session was found."
                    );
                }

                if (password.length < 8) {
                    throw new Error(
                        "Your new password must contain at least 8 characters."
                    );
                }

                if (password !== confirmPassword) {
                    throw new Error(
                        "Your passwords do not match."
                    );
                }

                const { error: updateError } =
                    await supabase.auth.updateUser({
                        password
                    });

                if (updateError) throw updateError;

                setComplete(true);

                // End the recovery session so the user
                // can sign in using the new password.
                await supabase.auth.signOut({
                    scope: "local"
                });
            }
        } catch (failure) {
            setError(
                failure.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <section
            className={
                "login-page password-recovery-page" +
                (isUpdate ? " password-recovery-overlay" : "")
            }>
            <div className="login-card">
                <span className="login-label">
                    A little creativity. A lot of community.
                </span>

                <h2>
                    {isUpdate
                        ? "Create a new password."
                        : "Forgot your password?"}
                </h2>

                <p className="login-intro">
                    {isUpdate
                        ? "Choose a new password for your Campus Makers account."
                        : "Enter your account email and we'll send you a password reset link."}
                </p>

                {checking ? (
                    <p className="login-hint" role="status">
                        Verifying your reset link...
                    </p>
                ) : complete ? (
                    <div
                        className="login-success"
                        role="status">
                        <span
                            className="login-success-mark"
                            aria-hidden="true">
                            ✓
                        </span>

                        <h3>
                            {isUpdate
                                ? "Password updated!"
                                : "Check your inbox"}
                        </h3>

                        <p>
                            {isUpdate
                                ? "Your password has been changed. You can now sign in with your new password."
                                : "If an account exists with that email, you'll receive a password reset link. Check your spam folder too."}
                        </p>

                        {isUpdate && (
                            <button
                                type="button"
                                className="login-submit"
                                onClick={backToLogin}>
                                Return to Login →
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {isUpdate && accountEmail && (
                            <p className="login-email-note">
                                Updating password for:{" "}
                                <strong>{accountEmail}</strong>
                            </p>
                        )}

                        {error && (
                            <p
                                className="login-error"
                                role="alert">
                                {error}
                            </p>
                        )}

                        {(!isUpdate || accountEmail) && (
                            <form
                                className="login-form"
                                onSubmit={handleSubmit}>
                                {!isUpdate ? (
                                    <div className="login-field">
                                        <label htmlFor="recovery-email">
                                            Account email
                                        </label>

                                        <input
                                            id="recovery-email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(event) =>
                                                setEmail(
                                                    event.target
                                                        .value
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="login-field">
                                            <label htmlFor="new-password">
                                                New password
                                            </label>

                                            <input
                                                id="new-password"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="At least 8 characters"
                                                value={password}
                                                onChange={(
                                                    event
                                                ) =>
                                                    setPassword(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                required
                                                minLength={8}
                                            />
                                        </div>

                                        <div className="login-field">
                                            <label htmlFor="confirm-new-password">
                                                Confirm new
                                                password
                                            </label>

                                            <input
                                                id="confirm-new-password"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="Repeat your password"
                                                value={
                                                    confirmPassword
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setConfirmPassword(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={busy}>
                                    {busy
                                        ? "Please wait..."
                                        : isUpdate
                                          ? "Update Password →"
                                          : "Send Reset Link →"}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>

            <a
                className="login-back"
                href="#login"
                onClick={(event) => {
                    event.preventDefault();
                    backToLogin();
                }}>
                ← Back to Login
            </a>
        </section>
    );
}
