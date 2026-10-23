import { useState } from "react";
import UniversitySelect from "./UniversitySelect";
import "./BecomeSeller.css";

function BecomeSeller({ onBack, onRegistered }) {
    const [selectedUniversity, setSelectedUniversity] =
        useState(null);

    const [schoolEmail, setSchoolEmail] = useState("");
    const [message, setMessage] = useState("");
    const [hasError, setHasError] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!selectedUniversity) {
            setHasError(true);
            setMessage(
                "Please select your university from the dropdown."
            );
            return;
        }

        const validSchoolEmail = /^[^\s@]+@[^\s@]+\.edu$/i.test(
            schoolEmail.trim()
        );

        if (!validSchoolEmail) {
            setHasError(true);
            setMessage(
                "Please enter a school email ending in .edu."
            );
            return;
        }

        // Demo only: the email format is checked,
        // but no real student verification takes place.
        setHasError(false);
        setMessage("");

        onRegistered();
    };

    return (
        <div className="become-seller-page">
            {/* BACK BUTTON */}
            <button
                type="button"
                className="become-seller-back"
                onClick={onBack}>
                ← Back to Profile
            </button>

            {/* SELLER HEADER */}
            <div className="become-seller-header">
                <div className="become-seller-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true">
                        <path d="M3 9 12 4l9 5v11H3V9Z" />
                        <path d="M3 9h18M8 20v-7h8v7" />
                    </svg>
                </div>

                <h2>Become a Campus Maker</h2>

                <p>
                    Turn your creativity into a campus business.
                    Join our community of student sellers.
                </p>
            </div>

            {/* SELLER BENEFITS */}
            <div className="become-seller-benefits">
                <h3>Why become a seller?</h3>

                <div>
                    <span>✓</span>
                    <p>
                        Create listings for your handmade
                        products.
                    </p>
                </div>

                <div>
                    <span>✓</span>
                    <p>Connect with students on your campus.</p>
                </div>

                <div>
                    <span>✓</span>
                    <p>
                        Manage orders and pickup appointments.
                    </p>
                </div>
            </div>

            {/* SELLER REGISTRATION */}
            <form
                className="become-seller-form"
                onSubmit={handleSubmit}>
                <h3>School Information</h3>

                <p>
                    To preview the Campus Makers seller
                    experience, select your university and enter
                    a school email.
                </p>

                {/* SEARCHABLE UNIVERSITY DROPDOWN */}
                <UniversitySelect
                    value={selectedUniversity}
                    onChange={(university) => {
                        setSelectedUniversity(university);
                        setMessage("");
                    }}
                />

                {/* SCHOOL EMAIL */}
                <label htmlFor="seller-email">
                    School Email
                </label>

                <input
                    id="seller-email"
                    type="email"
                    value={schoolEmail}
                    onChange={(event) => {
                        setSchoolEmail(event.target.value);
                        setMessage("");
                    }}
                    placeholder="yourname@university.edu"
                    autoComplete="email"
                    required
                />

                <p className="become-seller-hint">
                    For this demo, enter a sample email ending
                    in .edu.
                </p>

                {/* VALIDATION MESSAGE */}
                {message && (
                    <div
                        className={`become-seller-message ${
                            hasError
                                ? "become-seller-message-error"
                                : "become-seller-message-info"
                        }`}
                        role="status">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    className="become-seller-submit">
                    Continue to Seller Preview →
                </button>

                <p className="become-seller-disclaimer">
                    Demo only. No real seller account is created
                    or verified. Preview access is saved in this
                    browser.
                </p>
            </form>
        </div>
    );
}

export default BecomeSeller;
