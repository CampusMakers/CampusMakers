import { useState } from "react";
import {
    requestPasswordReset,
    resetPassword
} from "../services/authApi";
import "./Login.css";
import "./PasswordRecovery.css";

export default function PasswordRecovery({
    mode = "request",
    onBack
}) {
    const isUpdate = mode === "update";
    // Check whether the password reset link is valid enough to display.
    const resetParams = new URLSearchParams(
        window.location.search
    );

    const invalidResetLink =
        isUpdate &&
        (!resetParams.get("token") || resetParams.has("error"));

    const [email, setEmail] = useState("");
    const accountEmail = "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [busy, setBusy] = useState(false);
    const checking = false;
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState("");

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

        try {
            setBusy(true);

            if (isUpdate) {
                const params = new URLSearchParams(
                    window.location.search
                );
                const token = params.get("token");

                if (!token || params.has("error")) {
                    setError(
                        "This reset link is invalid or expired."
                    );
                    return;
                }

                if (password !== confirmPassword) {
                    setError("Passwords do not match.");
                    return;
                }

                await resetPassword({
                    token,
                    newPassword: password
                });
            } else {
                await requestPasswordReset(email.trim());
            }

            setComplete(true);
        } catch {
            setError(
                isUpdate
                    ? "Unable to reset your password. The link may have expired."
                    : "Unable to process your request right now. Please try again."
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
                        : "Enter your account email to request a password reset link."}
                </p>

                {invalidResetLink ? (
                    <p className="login-error" role="alert">
                        This password reset link is invalid or
                        expired. Please request a new one.
                    </p>
                ) : checking ? (
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

                        {(!isUpdate ||
                            new URLSearchParams(
                                window.location.search
                            ).get("token")) && (
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
