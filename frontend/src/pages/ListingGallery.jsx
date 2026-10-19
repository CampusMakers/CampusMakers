
import { useState } from "react";

function ListingGallery({ images, productName }) {
    const [photoIndex, setPhotoIndex] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div className="profile-listing-image">
                Product Image
            </div>
        );
    }

    const previousPhoto = () => {
        setPhotoIndex(
            (current) =>
                (current - 1 + images.length) % images.length
        );
    };

    const nextPhoto = () => {
        setPhotoIndex(
            (current) => (current + 1) % images.length
        );
    };

    return (
        <div className="profile-listing-gallery">
            {images[photoIndex] ? (
                <img
                    className="profile-listing-image"
                    src={images[photoIndex]}
                    alt={`${productName} - Photo ${photoIndex + 1}`}
                />
            ) : (
                <div className="profile-listing-image profile-gallery-placeholder">
                    Pic {photoIndex + 1}
                </div>
            )}

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        className="profile-gallery-arrow profile-gallery-prev"
                        aria-label="Previous photo"
                        onClick={previousPhoto}
                    >
                        &#10094;
                    </button>

                    <button
                        type="button"
                        className="profile-gallery-arrow profile-gallery-next"
                        aria-label="Next photo"
                        onClick={nextPhoto}
                    >
                        &#10095;
                    </button>

                    <div className="profile-gallery-count">
                        {photoIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>
    );
}

export default ListingGallery;
