import { useState } from "react";
import "./Settings.css";

function Settings({ onBack, profile }) {
    const [activeSection, setActiveSection] =
        useState("account");

    const sections = [
        {
            id: "account",
            title: "Account Information",
            description:
                "View your profile and school information.",
            icon: "👤"
        },
        {
            id: "about",
            title: "About Us",
            description: "Learn more about Campus Makers.",
            icon: "ⓘ"
        },
        {
            id: "contact",
            title: "Contact Us",
            description: "Get help or send feedback.",
            icon: "✉"
        },
        {
            id: "logout",
            title: "Log Out",
            description: "Sign out of your account.",
            icon: "↪"
        },
        {
            id: "delete",
            title: "Delete Account",
            description: "Manage account deletion.",
            icon: "✕"
        }
    ];

    return (
        <div className="settings-page">
            {/* BACK TO PROFILE */}
            <button
                type="button"
                className="settings-back"
                onClick={onBack}>
                ← Back to Profile
            </button>

            {/* SETTINGS HEADER */}
            <div className="settings-header">
                <div className="settings-header-icon">⚙</div>

                <h2>Settings</h2>
                <p>
                    Manage your Campus Makers account and
                    preferences.
                </p>
            </div>

            {/* SETTINGS OPTIONS */}
            <div className="settings-container">
                <nav
                    className="settings-menu"
                    aria-label="Settings sections">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className={`settings-menu-item ${
                                activeSection === section.id
                                    ? "settings-menu-active"
                                    : ""
                            } ${
                                section.id === "delete"
                                    ? "settings-menu-danger"
                                    : ""
                            }`}
                            aria-current={
                                activeSection === section.id
                                    ? "true"
                                    : undefined
                            }
                            onClick={() =>
                                setActiveSection(section.id)
                            }>
                            <span className="settings-menu-icon">
                                {section.icon}
                            </span>

                            <span className="settings-menu-text">
                                <strong>{section.title}</strong>
                                <small>
                                    {section.description}
                                </small>
                            </span>

                            <span
                                className="settings-menu-arrow"
                                aria-hidden="true">
                                ›
                            </span>
                        </button>
                    ))}
                </nav>

                {/* SELECTED SETTINGS SECTION */}
                <section className="settings-content">
                    {activeSection === "account" && (
                        <>
                            <h3>Account Information</h3>
                            <p className="settings-description">
                                Your Campus Makers profile
                                information.
                            </p>

                            <div className="settings-info-row">
                                <span>Display Name</span>
                                <strong>
                                    {profile?.name ||
                                        "Your Name"}
                                </strong>{" "}
                            </div>

                            <div className="settings-info-row">
                                <span>Username</span>
                                <strong>
                                    @
                                    {profile?.username ||
                                        "username"}
                                </strong>{" "}
                            </div>

                            <div className="settings-info-row">
                                <span>School Email</span>
                                <strong>
                                    Not connected yet
                                </strong>
                            </div>

                            <div className="settings-info-row">
                                <span>University</span>
                                <strong>
                                    Not connected yet
                                </strong>
                            </div>

                            <p className="settings-note">
                                Account information will be
                                connected to the backend later.
                            </p>
                        </>
                    )}

                    {activeSection === "about" && (
                        <>
                            <h3>About Campus Makers</h3>

                            <p className="settings-description">
                                Campus Makers is a
                                student-focused marketplace
                                connecting campus creators with
                                students who want to discover
                                and support their work.
                            </p>

                            <p className="settings-description">
                                Our goal is to make it easier to
                                discover handmade products,
                                connect with creators, and
                                participate in local campus
                                events.
                            </p>
                        </>
                    )}

                    {activeSection === "contact" && (
                        <>
                            <h3>Contact Us</h3>

                            <p className="settings-description">
                                Have a question, suggestion, or
                                issue with Campus Makers?
                            </p>

                            <p className="settings-note">
                                Support contact information and
                                feedback options will be
                                available when the platform is
                                connected to the backend.
                            </p>
                        </>
                    )}

                    {activeSection === "logout" && (
                        <>
                            <h3>Log Out</h3>

                            <p className="settings-description">
                                This option will securely sign
                                you out of your Campus Makers
                                account.
                            </p>

                            <p className="settings-note">
                                Demo only: authentication has
                                not been connected yet, so
                                logout is currently unavailable.
                            </p>
                        </>
                    )}

                    {activeSection === "delete" && (
                        <>
                            <h3>Delete Account</h3>

                            <p className="settings-description">
                                Account deletion will allow
                                users to request removal of
                                their Campus Makers account.
                            </p>

                            <p className="settings-warning">
                                Demo only: no account will be
                                deleted. Secure account deletion
                                will be added when
                                authentication and database
                                integration are complete.
                            </p>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Settings;
