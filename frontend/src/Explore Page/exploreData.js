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
    }
];

export const postTags = (post) => post.tags || [post.tag];
export const createExploreFeed = () =>
    [...explorePosts].sort(() => Math.random() - 0.5);
export const currentExplorePostId = () => {
    const id = window.location.hash.split("?")[0].match(/^#explore\/((?:post-)?\d+)$/i)?.[1];
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
