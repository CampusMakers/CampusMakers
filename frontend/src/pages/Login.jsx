import "./Login.css";

export default function Login() {
    return (
        <section
            className="login-page"
            aria-labelledby="login-heading">
            <div className="login-card">
                <span className="login-label">
                    Your Campus Makers account
                </span>
                <h2 id="login-heading">
                    Login form coming soon
                </h2>
                <p>
                    Logging in and creating a buyer profile will
                    be available soon. For now, explore the demo
                    and discover your favorite creators.
                </p>
                <a className="login-back" href="#home">
                    ← Back to Home
                </a>
            </div>
        </section>
    );
}
