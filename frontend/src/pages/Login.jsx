import { useRef, useState } from "react";
import "./Login.css";

export default function Login() {
    const [role, setRole] = useState("buyer");
    const [mode, setMode] = useState("login");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [complete, setComplete] = useState(false);
    const formRef = useRef(null);
    const isSignup = mode === "signup";
    const isSeller = role === "seller";

    const resetFeedback = () => {
        setErrors({});
        setComplete(false);
    };

    const changeMode = (nextMode) => {
        setMode(nextMode);
        setShowPassword(false);
        formRef.current?.reset();
        resetFeedback();
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const email = data.get("email").trim();
        const password = data.get("password");
        const nextErrors = {};

        if (isSignup && !data.get("name").trim()) {
            nextErrors.name = "Please enter your name.";
        }
        if (!email || !form.elements.email.validity.valid) {
            nextErrors.email = "Please enter a valid email address.";
        } else if (isSeller && !/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) {
            nextErrors.email = "Sellers need a school email ending in .edu.";
        }
        if (!password) {
            nextErrors.password = "Please enter your password.";
        } else if (isSignup && password.length < 8) {
            nextErrors.password = "Use at least 8 characters for your password.";
        }
        if (isSignup && data.get("confirmPassword") !== password) {
            nextErrors.confirmPassword = "Your passwords do not match.";
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            setComplete(false);
            form.elements[Object.keys(nextErrors)[0]].focus();
            return;
        }

        // Frontend preview only. Never persist or log passwords.
        // A future auth service must enforce the role/email rule
        // server-side and verify email ownership before granting access.
        form.reset();
        setShowPassword(false);
        setComplete(true);
    };

    const fieldFeedback = (name, hint) => ({
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": [hint, errors[name] && `${name}-error`]
            .filter(Boolean)
            .join(" ") || undefined
    });

    return (
        <section className="login-page" aria-labelledby="login-heading">
            <fieldset className="login-role-picker">
                <legend>I’m here as a</legend>
                <div className="login-role-options">
                    {["buyer", "seller"].map((option) => (
                        <label className="login-role-option" key={option}>
                            <input
                                type="radio"
                                name="account-role"
                                value={option}
                                checked={role === option}
                                onChange={() => {
                                    setRole(option);
                                    resetFeedback();
                                }}
                            />
                            <span>
                                <strong>{option === "buyer" ? "Buyer" : "Seller"}</strong>
                                <small>{option === "buyer" ? "Find something special" : "Share what you make"}</small>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="login-card">
                <div className="login-mode-switch" role="group" aria-label="Account action">
                    <button type="button" aria-pressed={!isSignup} onClick={() => changeMode("login")}>
                        Log in
                    </button>
                    <button type="button" aria-pressed={isSignup} onClick={() => changeMode("signup")}>
                        Create account
                    </button>
                </div>

                <span className="login-label">A little creativity. A lot of community.</span>
                <h2 id="login-heading">{isSignup ? "Find your people." : "Welcome back."}</h2>
                <p className="login-intro">
                    {isSeller
                        ? "Give your creations a home on campus."
                        : "Discover local makers and your next favorite find."}
                </p>

                <p className={`login-email-note ${isSeller ? "login-email-note-seller" : ""}`} id="email-hint">
                    {isSeller
                        ? "For student makers: use your school email ending in .edu."
                        : "Everyone is welcome. Use any valid email address."}
                </p>

                {complete ? (
                    <div className="login-success" role="status">
                        <span className="login-success-mark" aria-hidden="true">✓</span>
                        <h3>{isSignup ? "Your signup form looks good!" : "Your login form looks good!"}</h3>
                        <p>
                            {isSeller ? "Your email meets the .edu requirement. " : "Your buyer details passed validation. "}
                            This is a preview; no account has been created or signed in.
                        </p>
                        <a className="login-submit" href="#explore">Explore Campus Makers →</a>
                        <button type="button" className="login-text-button" onClick={resetFeedback}>
                            Back to {isSignup ? "signup" : "login"}
                        </button>
                    </div>
                ) : (
                    <form ref={formRef} className="login-form" onSubmit={handleSubmit} noValidate onChange={resetFeedback}>
                        {isSignup && (
                            <div className="login-field">
                                <label htmlFor="login-name">Full name</label>
                                <input id="login-name" name="name" type="text" autoComplete="name" placeholder="Your name" required {...fieldFeedback("name")} />
                                {errors.name && <p className="login-error" id="name-error">{errors.name}</p>}
                            </div>
                        )}
                        <div className="login-field">
                            <label htmlFor="login-email">{isSeller ? "School email" : "Email address"}</label>
                            <input id="login-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={isSeller ? "you@university.edu" : "you@example.com"} required {...fieldFeedback("email", "email-hint")} />
                            {errors.email && <p className="login-error" id="email-error">{errors.email}</p>}
                        </div>
                        <div className="login-field">
                            <label htmlFor="login-password">Password</label>
                            <div className="login-password-input">
                                <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "Create a password" : "Enter your password"} required {...fieldFeedback("password", isSignup ? "password-hint" : undefined)} />
                                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
                            </div>
                            {isSignup && <p className="login-hint" id="password-hint">Use at least 8 characters.</p>}
                            {errors.password && <p className="login-error" id="password-error">{errors.password}</p>}
                        </div>
                        {isSignup && (
                            <div className="login-field">
                                <label htmlFor="login-confirm-password">Confirm password</label>
                                <input id="login-confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" required {...fieldFeedback("confirmPassword")} />
                                {errors.confirmPassword && <p className="login-error" id="confirmPassword-error">{errors.confirmPassword}</p>}
                            </div>
                        )}
                        <button className="login-submit" type="submit">
                            {isSignup ? "Create" : "Log in to"} {isSeller ? "seller" : "buyer"} account <span aria-hidden="true">→</span>
                        </button>
                        <p className="login-demo-note">Demo preview. Accounts and email verification aren’t connected yet. Use sample details.</p>
                    </form>
                )}
            </div>
            <a className="login-back" href="#home">← Back to Home</a>
        </section>
    );
}
