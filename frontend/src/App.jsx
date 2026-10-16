import { useEffect, useRef, useState } from "react";
import "./App.css";

const pages = ["Home", "Map", "Calendar", "Explore", "Profile"];

function Icon({ name }) {
    const shapes = {
        Home: <path d="M4 12 16 2l12 10v18H4Z" />,
        Map: (
            <path
                fillRule="evenodd"
                d="M16 1a11 11 0 0 0-11 11c0 8 11 20 11 20s11-12 11-20A11 11 0 0 0 16 1Zm0 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
            />
        ),
        Calendar: (
            <>
                <path d="M3 3h26v27H3z" />
                <path
                    d="M3 8h26M3 11h26"
                    stroke="var(--paper)"
                    strokeWidth="1"
                />
            </>
        ),
        Explore: (
            <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <circle cx="13" cy="13" r="10" />
                <path d="m21 21 10 10" />
            </g>
        ),
        Profile: (
            <>
                <circle cx="16" cy="5" r="4" />
                <path d="m16 11 11 19H5Z" />
            </>
        )
    };
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
            {shapes[name]}
        </svg>
    );
}

function currentPage() {
    const slug = window.location.hash.slice(1).toLowerCase();
    return (
        pages.find((page) => page.toLowerCase() === slug) ||
        "Home"
    );
}

function Shelf({ title, creators = false }) {
    const rail = useRef(null);
    const [expanded, setExpanded] = useState(false);
    return (
        <section className="shelf" aria-label={title}>
            <div className="section-heading">
                <h2>{title}</h2>
                <button
                    className="see-more"
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}>
                    {expanded ? "See less" : "See more"}
                </button>
            </div>
            <div className="shelf-body">
                <div
                    className={`card-rail${expanded ? " expanded" : ""}`}
                    ref={rail}>
                    {Array.from({ length: 6 }, (_, index) => (
                        <figure className="card" key={index}>
                            <div
                                className="image-placeholder"
                                role="img"
                                aria-label={`${creators ? "Creator" : "Listing"} image placeholder ${index + 1}`}>
                                {!creators && (
                                    <span>@creator</span>
                                )}
                            </div>
                            <figcaption>
                                {creators
                                    ? "@creator"
                                    : "Title"}
                            </figcaption>
                        </figure>
                    ))}
                </div>
                {!expanded && (
                    <button
                        className="next"
                        aria-label={`Show more ${title.toLowerCase()}`}
                        onClick={() =>
                            rail.current.scrollBy({
                                left: rail.current.clientWidth,
                                behavior: "smooth"
                            })
                        }>
                        ▸
                    </button>
                )}
            </div>
        </section>
    );
}

function App() {
    const [page, setPage] = useState(currentPage);
    const [filterOpen, setFilterOpen] = useState(false);
    useEffect(() => {
        const onNavigation = () => {
            setPage(currentPage());
            setFilterOpen(false);
        };
        window.addEventListener("hashchange", onNavigation);
        return () =>
            window.removeEventListener(
                "hashchange",
                onNavigation
            );
    }, []);

    return (
        <div className="app-shell">
            <header className="brand">
                {/* Temporary mark until the original logo export is supplied. */}
                <span className="brand-mark" aria-hidden="true">
                    CM
                </span>
                <h1>Campus Makers</h1>
            </header>
            <main
                aria-label={`${page} page`}
                className={
                    page === "Home" ? "home" : "blank-page"
                }>
                {page === "Home" && (
                    <>
                        <div className="filter-row">
                            <button
                                className="filter-button"
                                aria-expanded={filterOpen}
                                onClick={() =>
                                    setFilterOpen(!filterOpen)
                                }>
                                filter
                            </button>
                        </div>
                        {filterOpen && (
                            <div
                                className="filter-panel"
                                role="status">
                                Filters will be available when
                                listings are added.
                            </div>
                        )}
                        <Shelf title="Product listings" />
                        <Shelf title="From your creators" />
                        <Shelf
                            title="Suggested creators"
                            creators
                        />
                    </>
                )}
            </main>
            <nav
                className="bottom-nav"
                aria-label="Main navigation">
                {pages.map((item) => (
                    <a
                        key={item}
                        href={`#${item.toLowerCase()}`}
                        aria-label={item}
                        title={item}
                        aria-current={
                            page === item ? "page" : undefined
                        }>
                        <Icon name={item} />
                        <span>{item}</span>
                    </a>
                ))}
            </nav>
        </div>
    );
}
export default App;
