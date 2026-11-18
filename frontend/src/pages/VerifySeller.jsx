
import { useEffect, useState } from "react";
import { confirmSellerVerification } from "../services/sellerVerificationApi";
import { AUTH_CHANGE_EVENT } from "../services/authApi";
import "./Login.css";

export default function VerifySeller() {
    const [token, setToken] = useState("");
    const [status, setStatus] = useState("invalid");
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Read the verification token from the email link.
        const query = window.location.hash.split("?")[1] || "";
        const receivedToken = new URLSearchParams(query).get("token");

        // Remove the token from the visible browser URL.
        if (receivedToken !== null) {
            window.history.replaceState(
                window.history.state,
                "",
                `${window.location.pathname}${window.location.search}#verify-seller`
            );
        }

        if (!receivedToken || !/^[a-f0-9]{64}$/.test(receivedToken)) {
            return;
        }

        setToken(receivedToken);
        setStatus("ready");
    }, []);

    async function handleVerification() {
        if (!token || status === "loading") return;

        setStatus("loading");
        setMessage("");

        try {
            await confirmSellerVerification(token);

            // Refresh the signed-in user's verification status.
            window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

            setToken("");
            setStatus("success");
        } catch (error) {
            setStatus("error");
            setMessage(error.message || "Verification failed.");
        }
    }

    return (
        <section className="login-page">
            <div className="login-card">
                <h2>University Email Verification</h2>

                {status === "ready" && (
                    <>
                        <p>
                            Confirm your university email to unlock
                            Campus Makers Seller Mode.
                        </p>
                        <button
                            type="button"
                            className="login-submit"
                            onClick={handleVerification}
                        >
                            Verify My Email
                        </button>
                    </>
                )}

                {status === "loading" && (
                    <p role="status">Verifying your email...</p>
                )}

                {status === "success" && (
                    <>
                        <p role="status">
                            Your university email has been verified!
                        </p>
                        <button
                            type="button"
                            className="login-submit"
                            onClick={() => {
                                window.location.hash = "profile";
                            }}
                        >
                            Continue to Profile
                        </button>
                    </>
                )}

                {status === "error" && (
                    <div role="alert">
                        <p>{message}</p>
                        <button
                            type="button"
                            className="login-submit"
                            onClick={handleVerification}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {status === "invalid" && (
                    <p role="alert">
                        This verification link is missing or invalid.
                        Request a new email from your seller profile.
                    </p>
                )}
            </div>
        </section>
    );
}
