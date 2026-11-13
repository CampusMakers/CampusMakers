import { useState } from "react";
import "./Login.css";
import "./BecomeSeller.css";

function BecomeSeller({
    onBack,
    onRegistered,
    onRequestVerification,
    user,
    sellerVerified = false
}) {
    const [schoolEmail, setSchoolEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const accountEmail = user?.email || "";
    const schoolEmailPattern = /^[^\s@]+@[^\s@]+\.edu$/i;

    async function handleVerification(event) {
        event.preventDefault();

        setError("");
        setMessage("");

        const email = schoolEmail.trim().toLowerCase();

        if (!schoolEmailPattern.test(email)) {
            setError(
                "Enter a valid university email ending in .edu."
            );
            return;
        }

        // The Profile currently does not provide this callback.
        // We'll connect it to the backend verification endpoint
        // once that endpoint is available.
        if (!onRequestVerification) {
            setMessage(
                "Your school email format looks valid. " +
                    "Verification is not connected yet, " +
                    "so no email has been sent."
            );
            return;
        }

        setBusy(true);

        try {
            await onRequestVerification(email);

            setMessage(
                "Verification requested. Check your school " +
                    "inbox for the confirmation instructions."
            );
        } catch (failure) {
            setError(
                failure.message ||
                    "Could not request verification."
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <section
            className="login-page seller-onboarding"
            aria-labelledby="seller-onboarding-heading">
            <div className="seller-onboarding-top">
                <span>CAMPUS MAKERS</span>
                <span className="seller-onboarding-step">
                    SELLER SETUP
                </span>
            </div>

            <div className="seller-onboarding-heading">
                <h2 id="seller-onboarding-heading">
                    Start selling on campus.
                </h2>

                <p>
                    Turn your creativity into something students
                    can discover, love, and buy.
                </p>
            </div>

            <div className="login-card seller-onboarding-card">
                <div className="seller-onboarding-card-heading">
                    <span
                        className="seller-onboarding-symbol"
                        aria-hidden="true">
                        🎓
                    </span>

                    <div>
                        <h3>Verify your student status</h3>
                        <p>
                            Use your school email to unlock
                            seller features.
                        </p>
                    </div>
                </div>

                <div className="seller-onboarding-account">
                    <span>YOUR CURRENT ACCOUNT</span>
                    <strong>
                        {accountEmail || "Not signed in"}
                    </strong>
                </div>

                {sellerVerified ? (
                    <div className="seller-onboarding-verified">
                        <span aria-hidden="true">✓</span>

                        <div>
                            <h3>You're eligible to sell!</h3>
                            <p>
                                Your school email is verified.
                                No additional verification or
                                password is needed.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="seller-onboarding-description">
                            Add your university email below.
                            You'll use your existing Campus
                            Makers account and password.
                        </p>

                        <form
                            className="seller-onboarding-form"
                            onSubmit={handleVerification}>
                            <label htmlFor="seller-school-email">
                                University email
                            </label>

                            <input
                                id="seller-school-email"
                                type="email"
                                autoComplete="email"
                                placeholder="student@university.edu"
                                value={schoolEmail}
                                onChange={(event) => {
                                    setSchoolEmail(
                                        event.target.value
                                    );
                                    setError("");
                                    setMessage("");
                                }}
                                required
                                disabled={busy}
                            />

                            <p className="seller-onboarding-hint">
                                A verification link will be sent
                                to your school inbox once
                                verification is available.
                            </p>

                            {error && (
                                <p
                                    className="seller-onboarding-error"
                                    role="alert">
                                    {error}
                                </p>
                            )}

                            {message && (
                                <p
                                    className="seller-onboarding-message"
                                    role="status">
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={busy}>
                                {busy
                                    ? "Requesting verification..."
                                    : "Continue with School Email →"}
                            </button>
                        </form>
                    </>
                )}

                {sellerVerified && (
                    <button
                        type="button"
                        className="login-submit"
                        onClick={onRegistered}>
                        Continue to Seller Mode →
                    </button>
                )}

                <div className="seller-onboarding-footer">
                    <span aria-hidden="true">🔒</span>
                    One account. One password. Both modes.
                </div>
            </div>

            <button
                type="button"
                className="seller-onboarding-back"
                onClick={onBack}>
                ← Back to Profile
            </button>
        </section>
    );
}

export default BecomeSeller;
