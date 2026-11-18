// Match the selected campus by domain, never by email suffix alone.
export function schoolEmailMatchesCampus(email, campusDomain) {
    const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();
    const normalizedDomain = String(campusDomain || "")
        .trim()
        .toLowerCase();
    const parts = normalizedEmail.split("@");

    if (
        parts.length !== 2 ||
        !parts[0] ||
        !normalizedDomain.endsWith(".edu") ||
        !/^[a-z0-9._%+-]+$/.test(parts[0])
    ) {
        return false;
    }

    return (
        parts[1] === normalizedDomain ||
        parts[1].endsWith(`.${normalizedDomain}`)
    );
}

export function validateSellerRegistration({
    name,
    schoolEmail
}) {
    const storeName = String(name || "").trim();
    const email = String(schoolEmail || "")
        .trim()
        .toLowerCase();

    // Validate store name length.
    if (storeName.length < 2 || storeName.length > 80) {
        return "Store name must be between 2 and 80 characters.";
    }

    // Require a properly formatted university email address.
    const schoolEmailPattern =
        /^[^\s@]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.edu$/;

    if (!schoolEmailPattern.test(email)) {
        return "Enter a valid university email address ending in .edu.";
    }

    return null;
}
