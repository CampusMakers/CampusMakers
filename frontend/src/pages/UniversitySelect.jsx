import { useEffect, useId, useMemo, useState } from "react";
import "./UniversitySelect.css";

const UNIVERSITY_URL =
    "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";

let catalogPromise = null;

function loadUniversities() {
    if (!catalogPromise) {
        catalogPromise = fetch(UNIVERSITY_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        "Unable to load universities."
                    );
                }

                return response.json();
            })
            .then((data) => {
                const universities = data
                    .filter(
                        (school) =>
                            school.alpha_two_code === "US" &&
                            typeof school.name === "string"
                    )
                    .map((school) => ({
                        id: `${school.name}-${school.domains?.[0] || ""}`,
                        name: school.name,
                        domains: school.domains || [],
                        state: school["state-province"] || ""
                    }))
                    .sort((a, b) =>
                        a.name.localeCompare(b.name)
                    );

                return universities;
            })
            .catch((error) => {
                catalogPromise = null;
                throw error;
            });
    }

    return catalogPromise;
}

// Common school abbreviations
function getSearchAliases(name) {
    const lower = name.toLowerCase();

    if (
        lower.includes("california polytechnic") &&
        lower.includes("san luis obispo")
    ) {
        return "cal poly cal poly slo";
    }

    if (
        lower.includes("polytechnic") &&
        lower.includes("pomona")
    ) {
        return "cal poly pomona";
    }

    if (
        lower.includes("university of california") &&
        lower.includes("los angeles")
    ) {
        return "ucla";
    }

    if (
        lower.includes("university of california") &&
        lower.includes("berkeley")
    ) {
        return "uc berkeley";
    }

    if (lower.includes("university of southern california")) {
        return "usc";
    }

    return "";
}

function UniversitySelect({ value, onChange }) {
    const inputId = useId();
    const listId = useId();

    const [universities, setUniversities] = useState([]);
    const [search, setSearch] = useState(value?.name || "");
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retryCount, setRetryCount] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        loadUniversities()
            .then((data) => {
                if (active) {
                    setUniversities(data);
                }
            })
            .catch(() => {
                if (active) {
                    setError(
                        "Unable to load universities. Please try again."
                    );
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [retryCount]);

    // Search universities by name, domain, or abbreviation
    const results = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query || value) {
            return [];
        }

        return universities
            .filter((university) => {
                const searchable = [
                    university.name,
                    university.state,
                    ...university.domains,
                    getSearchAliases(university.name)
                ]
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(query);
            })
            .slice(0, 12);
    }, [search, universities, value]);

    const selectUniversity = (university) => {
        setSearch(university.name);
        setActiveIndex(0);
        setIsOpen(false);
        onChange(university);
    };

    const handleSearch = (event) => {
        setSearch(event.target.value);
        setIsOpen(true);
        setActiveIndex(0);
        onChange(null);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            setIsOpen(false);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);

            setActiveIndex((current) =>
                results.length
                    ? (current + 1) % results.length
                    : 0
            );
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            setActiveIndex((current) =>
                results.length
                    ? (current - 1 + results.length) %
                      results.length
                    : 0
            );
        }

        if (
            event.key === "Enter" &&
            isOpen &&
            results.length > 0
        ) {
            event.preventDefault();

            selectUniversity(
                results[activeIndex] || results[0]
            );
        }
    };

    return (
        <div className="university-select">
            <label htmlFor={inputId}>School / University</label>

            <div
                className="university-select-container"
                onBlur={(event) => {
                    if (
                        !event.currentTarget.contains(
                            event.relatedTarget
                        )
                    ) {
                        setIsOpen(false);
                    }
                }}>
                {/* SEARCH INPUT */}
                <div className="university-input-wrapper">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m16 16 5 5" />
                    </svg>

                    <input
                        id={inputId}
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isOpen}
                        aria-controls={listId}
                        aria-activedescendant={
                            isOpen && results.length > 0
                                ? `${listId}-${activeIndex}`
                                : undefined
                        }
                        placeholder="Search your university..."
                        autoComplete="off"
                        value={search}
                        onChange={handleSearch}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {/* SEARCH RESULTS */}
                {isOpen && (
                    <div
                        className="university-dropdown"
                        id={listId}
                        role="listbox">
                        {loading && (
                            <p className="university-message">
                                Loading universities...
                            </p>
                        )}

                        {!loading && error && (
                            <div className="university-message">
                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setRetryCount(
                                            (current) =>
                                                current + 1
                                        )
                                    }>
                                    Retry
                                </button>
                            </div>
                        )}

                        {!loading &&
                            !error &&
                            !search.trim() && (
                                <p className="university-message">
                                    Start typing to find your
                                    school.
                                </p>
                            )}

                        {!loading &&
                            !error &&
                            search.trim() &&
                            results.length === 0 &&
                            !value && (
                                <p className="university-message">
                                    No matching universities
                                    found.
                                </p>
                            )}

                        {!loading &&
                            !error &&
                            results.map((university, index) => (
                                <button
                                    type="button"
                                    role="option"
                                    id={`${listId}-${index}`}
                                    aria-selected={
                                        activeIndex === index
                                    }
                                    key={university.id}
                                    className={`university-option ${
                                        activeIndex === index
                                            ? "university-option-active"
                                            : ""
                                    }`}
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() =>
                                        selectUniversity(
                                            university
                                        )
                                    }>
                                    <span className="university-option-details">
                                        <strong>
                                            {university.name}
                                        </strong>

                                        <small>
                                            {university.state ||
                                                university
                                                    .domains[0] ||
                                                "United States"}
                                        </small>
                                    </span>
                                </button>
                            ))}
                    </div>
                )}
            </div>

            {/* SELECTED UNIVERSITY */}
            {value && (
                <div className="university-selected">
                    <span aria-hidden="true">✓</span>

                    <p>
                        <strong>{value.name}</strong>

                        <span>
                            {value.state ||
                                value.domains?.[0] ||
                                "United States"}
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}

export default UniversitySelect;
