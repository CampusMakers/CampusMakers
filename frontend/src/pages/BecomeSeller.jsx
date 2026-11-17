import { useState } from "react";
import { createSellerStore } from "../services/sellerApi";
import { validateSellerRegistration } from "../services/sellerRegistration";
import "./Login.css";
import "./BecomeSeller.css";
import { requestSellerVerification } from "../services/sellerVerificationApi";

function BecomeSeller({
    onBack,
    onRegistered,
    onStoreCreated,
    user,
    sellerVerified = false
}) {
    const [storeName, setStoreName] = useState("");
    const [schoolEmail, setSchoolEmail] = useState("");
    const [registeredStore, setRegisteredStore] =
        useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [verificationSent, setVerificationSent] =
        useState(false);
    const existingStore = registeredStore || user?.store;
    const needsRegistration = !sellerVerified && !existingStore;

    async function handleRegistration(event) {
        event.preventDefault();
        if (busy || !needsRegistration) return;

        const validationError = validateSellerRegistration({
            name: storeName,
            schoolEmail
        });
        if (validationError) {
            setError(validationError);
            return;
        }

        setBusy(true);
        setError("");
        try {
            const store = await createSellerStore({
                name: storeName,
                schoolEmail
            });
            setRegisteredStore(store);
            onStoreCreated?.(store);
        } catch (failure) {
            setError(
                failure.message ||
                    "Unable to create your seller account."
            );
        } finally {
            setBusy(false);
        }
    }
    async function handleRequestVerification() {
        if (busy || !existingStore || sellerVerified) return;

        setBusy(true);
        setError("");

        try {
            await requestSellerVerification();
            setVerificationSent(true);
        } catch (failure) {
            setError(
                failure.message ||
                    "Unable to send verification email."
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
                        <h3>University seller registration</h3>
                        <p>
                            Use your existing Campus Makers
                            account.
                        </p>
                    </div>
                </div>

                <div className="seller-onboarding-account">
                    <span>YOUR CURRENT ACCOUNT</span>
                    <strong>
                        {user?.email || "Not signed in"}
                    </strong>
                </div>

                {sellerVerified ? (
                    <>
                        <div
                            className="seller-onboarding-verified"
                            role="status">
                            <span aria-hidden="true">✓</span>
                            <div>
                                <h3>
                                    You're eligible to sell!
                                </h3>
                                <p>
                                    Your store is active and
                                    verified.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="login-submit"
                            onClick={onRegistered}>
                            Continue to Seller Mode →
                        </button>
                    </>
                ) : existingStore ? (
                    <div className="seller-onboarding-message">
                        <strong>
                            {existingStore.name || "Your store"}{" "}
                            has been registered.
                        </strong>

                        <p>
                            Verify your university email to
                            unlock Seller Mode.
                        </p>

                        {verificationSent ? (
                            <p role="status">
                                Verification email requested!
                                Check your university inbox.
                            </p>
                        ) : (
                            <button
                                type="button"
                                className="login-submit"
                                onClick={
                                    handleRequestVerification
                                }
                                disabled={busy}>
                                {busy
                                    ? "Sending verification email..."
                                    : "Send Verification Email"}
                            </button>
                        )}

                        {error && (
                            <p
                                className="seller-onboarding-error"
                                role="alert">
                                {error}
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="seller-onboarding-description">
                            Register your store using your
                            university email. Registration does
                            not verify email ownership or unlock
                            Seller Mode.
                        </p>

                        <form
                            className="seller-onboarding-form"
                            onSubmit={handleRegistration}>
                            <label htmlFor="seller-store-name">
                                Store name
                            </label>
                            <input
                                id="seller-store-name"
                                type="text"
                                minLength={2}
                                maxLength={80}
                                placeholder="Your creative shop"
                                value={storeName}
                                onChange={(event) => {
                                    setStoreName(
                                        event.target.value
                                    );
                                    setError("");
                                }}
                                required
                                disabled={busy}
                            />

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
                                }}
                                required
                                disabled={busy}
                            />
                            <p className="seller-onboarding-hint">
                                Enter your university email
                                address. You'll receive a
                                verification link after
                                registering your store.
                            </p>
                            {error && (
                                <p
                                    className="seller-onboarding-error"
                                    role="alert">
                                    {error}
                                </p>
                            )}
                            <button
                                type="submit"
                                className="login-submit"
                                disabled={busy}>
                                {busy
                                    ? "Registering store…"
                                    : "Register Store (Pending Verification) →"}
                            </button>
                        </form>
                    </>
                )}

                <div className="seller-onboarding-footer">
                    <span aria-hidden="true">🔒</span>
                    One account. Seller privileges require
                    server verification.
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
