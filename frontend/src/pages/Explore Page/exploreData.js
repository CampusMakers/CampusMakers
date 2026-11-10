import { sellerSavedItems } from "../mockProfileData";

export const explorePosts = [
    {
        id: 1,
        type: "image",
        creator: "@maya.makes",
        caption: "A little color for a rainy study day.",
        tags: ["Art", "Painting", "Study break"],
        tone: "lavender",
        layout: "featured"
    },
    {
        id: 2,
        type: "text",
        creator: "@campusnotes",
        caption:
            "Reminder: your progress does not have to look like anyone else's. Keep showing up, one small step at a time.",
        tag: "Thoughts",
        layout: "tall"
    },
    {
        id: 3,
        type: "video",
        creator: "@devwithlee",
        caption:
            "A tiny desk reset before the next project sprint.",
        tags: ["Behind the scenes", "Workspace", "Coding"],
        tone: "peach",
        layout: "wide"
    },
    {
        id: 4,
        type: "image",
        creator: "@flora.studio",
        caption: "Testing out a few ideas for my next print.",
        tags: ["Design", "Printmaking"],
        tone: "mint",
        layout: "tall"
    },
    {
        id: 5,
        type: "text",
        creator: "@themakersclub",
        caption:
            "What are you making this week? Drop your current project below—we'd love to see it!",
        tag: "Community",
        layout: "standard"
    },
    {
        id: 6,
        type: "video",
        creator: "@noah.builds",
        caption: "From sketch to prototype in 30 seconds.",
        tags: ["Process", "Prototyping", "Design"],
        tone: "blue",
        layout: "wide"
    },
    {
        id: 7,
        type: "image",
        creator: "@jules.illustrates",
        caption:
            "Some little doodles from the margins of my notebook.",
        tag: "Illustration",
        tone: "yellow",
        layout: "featured"
    },
    {
        id: 8,
        type: "text",
        creator: "@campusmakers",
        caption:
            "Maker tip: take a photo of your work in progress. Future you will love seeing how far you've come.",
        tag: "Tips",
        layout: "standard"
    },
    {
        id: 9,
        type: "image",
        creator: "@rileyprints",
        caption:
            "Fresh ink, clean edges, and one very satisfying first pull.",
        tag: "Printmaking",
        tone: "blue",
        layout: "square"
    },
    {
        id: 10,
        type: "video",
        creator: "@makeswithmia",
        caption:
            "A quick look at today's clay texture experiment.",
        tag: "Ceramics",
        tone: "yellow",
        layout: "vertical"
    },
    {
        id: 11,
        type: "image",
        creator: "@archer.photo",
        caption:
            "Golden-hour light across the campus workshop.",
        tag: "Photography",
        tone: "peach",
        layout: "landscape"
    },
    {
        id: 12,
        type: "image",
        creator: "@threadedbyani",
        caption:
            "Trying a new palette for a small woven study.",
        tag: "Fiber art",
        tone: "mint",
        layout: "portrait"
    },
    {
        id: 13,
        type: "video",
        creator: "@builtbykai",
        caption:
            "A vertical walkthrough of a tiny interactive prototype.",
        tags: ["Prototype", "Interaction design", "Process"],
        tone: "lavender",
        layout: "vertical"
    },
    {
        id: 14,
        type: "image",
        creator: "@samsketches",
        caption:
            "Loose thumbnail sketches before the final illustration.",
        tag: "Sketchbook",
        tone: "yellow",
        layout: "portrait"
    },
    {
        id: 15,
        type: "image",
        creator: "@maya.makes",
        collaborators: ["@maya.makes", "@flora.studio", "@campusnotes"],
        caption: "Our campus print swap is almost ready — thanks @flora.studio and @campusnotes!",
        tags: ["Collaboration", "Printmaking", "Community"],
        tone: "lavender",
        layout: "wide"
    },
    {
        id: 16,
        type: "video",
        creator: "@devwithlee",
        collaborators: ["@devwithlee", "@noah.builds", "@builtbykai"],
        caption: "A tiny prototype sprint with @noah.builds and @builtbykai.",
        tags: ["Collaboration", "Coding", "Prototype"],
        tone: "blue",
        layout: "vertical"
    },
    {
        id: 17,
        type: "image",
        creator: "@jules.illustrates",
        collaborators: ["@jules.illustrates", "@samsketches"],
        caption: "Sketchbook swap day with @samsketches.",
        tags: ["Collaboration", "Illustration", "Sketchbook"],
        tone: "yellow",
        layout: "featured"
    },
    {
        id: 18,
        type: "text",
        creator: "@themakersclub",
        collaborators: ["@themakersclub", "@campusmakers", "@ava.collects"],
        caption: "Join @themakersclub, @campusmakers, and @ava.collects for a community make-and-share this Friday.",
        tags: ["Collaboration", "Community"],
        layout: "standard"
    },
    {
        id: 19,
        type: "image",
        creator: "@threadedbyani",
        collaborators: ["@threadedbyani", "@makeswithmia", "@flora.studio"],
        caption: "Color, clay, and fiber experiments with @makeswithmia and @flora.studio.",
        tags: ["Collaboration", "Fiber art", "Ceramics"],
        tone: "mint",
        layout: "portrait"
    },
    {
        id: 20,
        type: "text",
        creator: "@campusnotes",
        collaborators: ["@campusnotes", "@maya.makes"],
        caption: "A small creative reset from @campusnotes and @maya.makes: make room for your next idea.",
        tags: ["Collaboration", "Tips"],
        layout: "tall"
    },
    {
        id: 21,
        type: "image",
        creator: "@maya.makes",
        collaborators: ["@maya.makes", "@flora.studio"],
        caption: "Come by our print swap and mini market. We will have fresh prints, cards, and small originals ready for pickup.",
        tags: ["Event", "Printmaking", "Market"],
        tone: "lavender",
        layout: "featured",
        is_event: true,
        event_title: "Campus Print Swap & Mini Market",
        event_location: "University Union Plaza",
        event_starts_at: "2026-11-14T11:00:00-08:00",
        event_ends_at: "2026-11-14T15:00:00-08:00",
        event_posts: ["15", "17"],
        event_listings: [
            { id: "101", name: "Ash Droplet Chawan", price: 28, image: sellerSavedItems[0].image },
            { id: "103", name: "Conservatory Riso #4", price: 18, image: sellerSavedItems[2].image }
        ],
        event_slots: []
    },
    {
        id: 22,
        type: "text",
        creator: "@devwithlee",
        collaborators: ["@devwithlee", "@noah.builds"],
        caption: "Bring your half-finished project to our friendly prototype clinic. Reserve a short feedback session with a maker mentor.",
        tags: ["Event", "Coding", "Prototyping"],
        layout: "tall",
        is_event: true,
        event_title: "Prototype Clinic",
        event_location: "Library Innovation Lab, Room 204",
        event_starts_at: "2026-11-18T13:00:00-08:00",
        event_ends_at: "2026-11-18T16:00:00-08:00",
        event_posts: ["3", "16"],
        event_listings: [],
        event_slots: ["1:00 PM - 1:20 PM", "1:30 PM - 1:50 PM", "2:00 PM - 2:20 PM"]
    },
    {
        id: 23,
        type: "video",
        creator: "@threadedbyani",
        collaborators: ["@threadedbyani", "@makeswithmia", "@flora.studio"],
        caption: "A relaxed afternoon of color, clay, and fiber. Shop small pieces, make something at the table, or reserve a one-on-one mini session.",
        tags: ["Event", "Fiber art", "Ceramics", "Community"],
        tone: "mint",
        layout: "wide",
        is_event: true,
        event_title: "Make & Mingle Studio Social",
        event_location: "Arts Building Courtyard",
        event_starts_at: "2026-11-21T12:00:00-08:00",
        event_ends_at: "2026-11-21T16:00:00-08:00",
        event_posts: ["4", "19"],
        event_listings: [
            { id: "102", name: "Woven Grid Tapestry", price: 45, image: sellerSavedItems[1].image },
            { id: "104", name: "Kinetic Brass Dangles", price: 32, image: sellerSavedItems[3].image }
        ],
        event_slots: ["12:30 PM - Fiber color consult", "1:30 PM - Clay texture demo", "2:30 PM - Mini maker session"]
    },
    {
        id: 24,
        type: "text",
        creator: "@makeswithmia",
        collaborators: [],
        caption: "Join me for a hands-on clay texture demo! I'll share my favorite techniques and answer your questions about working with clay.",
        tags: ["Event", "Ceramics", "Workshop"],
        layout: "standard",
        is_event: true,
        event_title: "Clay Texture Demo with Mia",
        event_location: "Arts Building, Studio 102",
        event_starts_at: "2026-12-02T14:00:00-08:00",
        event_ends_at: "2026-12-02T16:00:00-08:00",
        event_posts: ["10"],
        event_listings: [],
        event_slots: ["2:00 PM - 2:30 PM", "2:45 PM - 3:15 PM", "3:30 PM - 4:00 PM"]
    }
];

// Home's sample marketplace inventory is also part of discovery.  Keeping a
// listing's own type lets Explore display it alongside maker posts without
// making it look like a regular post.
export const exploreListings = sellerSavedItems.map((listing) => ({
    ...listing,
    id: `listing-${listing.id}`,
    type: "listing",
    caption: listing.name,
    tags: ["Product listing", "Marketplace"],
    layout: "portrait",
    tone: "peach"
}));

export const postTags = (post) => post.tags || [post.tag];
export const createExploreFeed = () =>
    [...explorePosts, ...exploreListings].sort(() => Math.random() - 0.5);
export const currentExplorePostId = () => {
    const id = window.location.hash.split("?")[0].match(/^#explore\/((?:post-)?\d+)(?:\/event-details)?$/i)?.[1];
    return id?.startsWith("post-") ? id : Number(id) || null;
};
export const currentSellerUsername = () => {
    const creator = window.location.hash.split("?")[0].match(
        /^#seller\/([^/]+)$/i
    )?.[1];
    return creator ? `@${decodeURIComponent(creator)}` : null;
};

export const currentPostSource = () =>
    new URLSearchParams(window.location.hash.split("?")[1]).get(
        "from"
    ) === "home"
        ? "home"
        : "explore";

export const currentProfileFeedUsername = () => {
    const username = new URLSearchParams(
        window.location.hash.split("?")[1]
    ).get("profile");
    return username ? `@${decodeURIComponent(username)}` : null;
};
