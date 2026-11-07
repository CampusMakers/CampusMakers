import { auth } from "../src/auth.js";
import pool, { transaction } from "../src/db/pool.js";

const PASSWORD = "campusmakers123";

const campus = {
    name: "California Polytechnic State University, San Luis Obispo",
    domain: "calpoly.edu",
    state: "California"
};

const locations = [
    ["Kennedy Library Entrance", "1 Grand Ave, Building 35"],
    ["Dexter Lawn", "1 Grand Ave, Dexter Lawn"],
    ["University Union", "1 Grand Ave, Building 65"],
    ["Art & Design Building", "1 Grand Ave, Building 34"],
    ["Dexter Art Studio 102", "1 Grand Ave, Building 34, Room 102"],
    ["Campus Library, 2nd Floor", "1 Grand Ave, Building 35, Floor 2"]
];

const categories = ["Ceramics", "Prints", "Textiles", "Jewelry", "Illustration", "Accessories", "Home Goods", "Other"];

const sellers = [
    { username: "maya_makes", name: "Maya Chen", store: "Maya Makes", methods: ["cash", "venmo"] },
    { username: "slo_clay", name: "Jordan Reyes", store: "SLO Clay", methods: ["cash", "card"] },
    { username: "sam_stitches", name: "Sam Patel", store: "Sam Stitches", methods: ["venmo"] },
    { username: "crafty_zoe", name: "Zoe Kim", store: "Crafty Zoe", methods: ["cash", "venmo"] },
    { username: "studio_arun", name: "Arun Mehta", store: "Studio Arun", methods: ["card", "venmo"] },
    { username: "campus_creations", name: "Taylor Brooks", store: "Campus Creations", methods: ["cash", "card"] }
];

const creators = [
    "maya.makes", "campusnotes", "devwithlee", "flora.studio", "themakersclub", "noah.builds", "jules.illustrates",
    "campusmakers", "rileyprints", "makeswithmia", "archer.photo", "threadedbyani", "builtbykai", "samsketches"
];

const buyers = [
    { username: "demo", name: "Demo Student" },
    { username: "claire_crafts", name: "Claire Nguyen" },
    { username: "leo_ceramics", name: "Leo Garcia" }
];

const image = (id) => `https://lh3.googleusercontent.com/aida-public/${id}`;

const listings = [
    ["maya_makes", "Product #1", "Illustration", 18, 5, []],
    ["maya_makes", "San Luis Obispo Mug", "Ceramics", 26, 8, []],
    ["slo_clay", "Ash Droplet Chawan", "Ceramics", 28, 3, [image("AB6AXuCWKfXE1tBk85uublB2pjXA-v4yXbMWlQYmyfLvMSFvkzIKkVdWYKDUhRo0NGWwMYGfXHLq5yRJgHHFq3gD4N-2qOtyyWGYbaMB18bRD9a1Jkj1L0CqjMPCNsf2ThSwKqM5D71a0FeP14NsAdTh6ZDnfsZwDArjm0waFeE5u54dMSq5T_f6VEzJXGpiLpeT9sJ-yWWrM5wnaMtS_NFuTu9835kGYdf3xEKhFJWsUc0v82MJlHnwqyx1")]],
    ["slo_clay", "Handmade Ceramic Planter", "Ceramics", 34, 4, []],
    ["sam_stitches", "Woven Grid Tapestry", "Textiles", 45, 2, [image("AB6AXuCG0luMoAxhs2YIy_Dx1B7384a1SiESM90I37A6NBjQadX0Vc5nQuPZfwGIG-_xZ5XMR-1x4YZ1ODFW7E9H4CcgJbVverd49J80bcV3RpSD8dkU4zS6esYiE6XiNVH6nTJPPPuxLeiWErJj012C0NrTzmH2IPSTOe0dzVbZCuztE_T5NQQAVK7K6vW5cZ-oCwN3CTzLLO3JNO43QtaYSRYtDE3pgvgS57wneo3xTzFL19UyUYMpecri")]],
    ["crafty_zoe", "Conservatory Riso #4", "Prints", 18, 10, [image("AB6AXuCOWWir1CwBpnpvJSdqUoJv2D_L8__26xxl6eZIR08k70QAv8FnZTBblMmW6LYFT0JleOAB7rDGQNtttHktHiW3ahmj87YFGeYyohHCM5Hemtp4OVa0VMrcbSXKWg_Pdmog0v6mHSJD92Kik-vKEnsE0hkVrSlpIM4cxZMCr24NVtxKddpeTU11plINP24ODVcekUqjkz8FQQ-h2suWrUX6X04CyOxlZqf15MSrv1HnpvAymOQnQe9P")]],
    ["studio_arun", "Kinetic Brass Dangles", "Jewelry", 32, 6, [image("AB6AXuB9aA9_ej1FF1vIATNGMk05_SARkbUXR90GIsPtZv--66YH5n4mi7x0z3DGINBtQv61aaTYcfiymkKgbt6riQHjlk92U8PsRUd3eoJh9DzmdEcUAClrJh32f8ttBrX4uJbLMrgKd6BOzspjY_Xj4vfGMb4o612X4fIlwtuhgqGKb7m3MphGEH4wfknkK7wW-zvzgQWlIZGDK1JvBWTB9xmDM9ZP7w0sLzje6PZMudRHgIPlK3n36l3K")]],
    ["studio_arun", "Handmade Silver Bracelet", "Jewelry", 32, 3, []],
    ["campus_creations", "Handcrafted Canvas Tote", "Accessories", 22, 7, []]
];

const posts = [
    ["maya.makes", "image", "A little color for a rainy study day.", ["Art", "Painting", "Study break"]],
    ["campusnotes", "text", "Reminder: your progress does not have to look like anyone else's. Keep showing up, one small step at a time.", ["Thoughts"]],
    ["devwithlee", "video", "A tiny desk reset before the next project sprint.", ["Behind the scenes", "Workspace", "Coding"]],
    ["flora.studio", "image", "Testing out a few ideas for my next print.", ["Design", "Printmaking"]],
    ["themakersclub", "text", "What are you making this week? Drop your current project below. We'd love to see it!", ["Community"]],
    ["noah.builds", "video", "From sketch to prototype in 30 seconds.", ["Process", "Prototyping", "Design"]],
    ["jules.illustrates", "image", "Some little doodles from the margins of my notebook.", ["Illustration"]],
    ["campusmakers", "text", "Maker tip: take a photo of your work in progress. Future you will love seeing how far you've come.", ["Tips"]],
    ["rileyprints", "image", "Fresh ink, clean edges, and one very satisfying first pull.", ["Printmaking"]],
    ["makeswithmia", "video", "A quick look at today's clay texture experiment.", ["Ceramics"]],
    ["archer.photo", "image", "Golden-hour light across the campus workshop.", ["Photography"]],
    ["threadedbyani", "image", "Trying a new palette for a small woven study.", ["Fiber art"]],
    ["builtbykai", "video", "A vertical walkthrough of a tiny interactive prototype.", ["Prototype", "Interaction design", "Process"]],
    ["samsketches", "image", "Loose thumbnail sketches before the final illustration.", ["Sketchbook"]]
];

const placeholderMedia = (type, index) =>
    type === "text" ? null : `https://picsum.photos/seed/campus-makers-${index}/800/1000`;

const at = (days, hours, minutes = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
};

const signUp = async ({ username, name }) => {
    const existing = await pool.query("select id from users where username = $1", [username]);
    if (existing.rowCount) return existing.rows[0].id;
    const email = `${username}@calpoly.edu`;
    const result = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name, username } });
    return result.user.id;
};

const run = async () => {
    const already = await pool.query("select 1 from stores limit 1");
    if (already.rowCount) {
        console.log("Database already has stores; skipping seed");
        return;
    }

    const userIds = {};
    for (const person of [...sellers, ...buyers]) userIds[person.username] = await signUp(person);
    for (const handle of creators) {
        userIds[handle] ??= await signUp({ username: handle, name: handle.replace(/[._]/g, " ") });
    }

    await transaction(async (client) => {
        const insert = async (sql, params) => (await client.query(sql, params)).rows[0];

        const { id: campusId } = await insert(
            `insert into campuses (name, email_domain, state) values ($1, $2, $3)
             on conflict (email_domain) do update set name = excluded.name returning id`,
            [campus.name, campus.domain, campus.state]
        );
        await client.query("update users set campus_id = $1", [campusId]);

        const locationIds = {};
        for (const [name, address] of locations) {
            const row = await insert(
                `insert into locations (campus_id, name, address, city, state, zip)
                 values ($1, $2, $3, 'San Luis Obispo', 'CA', '93407') returning id`,
                [campusId, name, address]
            );
            locationIds[name] = row.id;
        }

        const categoryIds = {};
        for (const name of categories) {
            categoryIds[name] = (await insert("insert into categories (name) values ($1) returning id", [name])).id;
        }

        const storeIds = {};
        for (const seller of sellers) {
            const row = await insert(
                `insert into stores (owner_id, campus_id, name, description, school_email, verified_at)
                 values ($1, $2, $3, $4, $5, now()) returning id`,
                [
                    userIds[seller.username],
                    campusId,
                    seller.store,
                    `Handmade goods by ${seller.name}.`,
                    `${seller.username}@calpoly.edu`
                ]
            );
            storeIds[seller.username] = row.id;
            await client.query(
                "insert into store_payment_methods (store_id, method) select $1, unnest($2::payment_method[])",
                [row.id, seller.methods]
            );
            await client.query(
                `insert into availability (store_id, location_id, starts_at, ends_at) values ($1, $2, $3, $4)`,
                [row.id, locationIds["Dexter Lawn"], at(1, 11), at(1, 15)]
            );
        }

        const listingIds = {};
        for (const [seller, title, category, price, quantity, images] of listings) {
            const row = await insert(
                `insert into listings (store_id, category_id, title, description, quantity, price)
                 values ($1, $2, $3, $4, $5, $6) returning id`,
                [storeIds[seller], categoryIds[category], title, `${title}, handmade on campus.`, quantity, price]
            );
            listingIds[title] = row.id;
            for (const [position, url] of images.entries()) {
                await client.query("insert into listing_images (listing_id, url, position) values ($1, $2, $3)", [
                    row.id,
                    url,
                    position
                ]);
            }
        }

        const demo = userIds.demo;
        for (const title of ["Ash Droplet Chawan", "Woven Grid Tapestry", "Conservatory Riso #4", "Kinetic Brass Dangles"]) {
            await client.query("insert into saved_listings (user_id, listing_id) values ($1, $2)", [demo, listingIds[title]]);
        }
        for (const seller of ["maya_makes", "slo_clay", "studio_arun"]) {
            await client.query("insert into follows (follower_id, followee_id) values ($1, $2)", [demo, userIds[seller]]);
        }

        const order = async ({ buyer, seller, title, quantity = 1, price, status, method, paid, location, pickupAt, pin, createdAt }) => {
            const row = await insert(
                `insert into orders (buyer_id, store_id, status, payment_method, paid_at, pickup_location_id, pickup_at, pickup_pin, created_at)
                 values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, now())) returning id`,
                [
                    userIds[buyer],
                    storeIds[seller],
                    status,
                    method,
                    paid ? createdAt ?? new Date().toISOString() : null,
                    locationIds[location],
                    pickupAt,
                    pin ?? null,
                    createdAt ?? null
                ]
            );
            const item = await insert(
                `insert into order_items (order_id, listing_id, title, quantity, unit_price) values ($1, $2, $3, $4, $5) returning id`,
                [row.id, listingIds[title], title, quantity, price]
            );
            return item.id;
        };

        await order({ buyer: "demo", seller: "maya_makes", title: "San Luis Obispo Mug", price: 26, status: "ready", method: "card", paid: true, location: "Kennedy Library Entrance", pickupAt: at(1, 14, 30), pin: "4826" });
        await order({ buyer: "demo", seller: "slo_clay", title: "Handmade Ceramic Planter", price: 34, status: "scheduled", method: "cash", paid: false, location: "Dexter Lawn", pickupAt: at(3, 12, 15) });
        const toteItem = await order({ buyer: "demo", seller: "campus_creations", title: "Handcrafted Canvas Tote", price: 22, status: "completed", method: "card", paid: true, location: "University Union", pickupAt: at(-21, 13), createdAt: at(-23, 10) });
        await order({ buyer: "demo", seller: "studio_arun", title: "Handmade Silver Bracelet", price: 32, status: "completed", method: "venmo", paid: true, location: "Dexter Lawn", pickupAt: at(-32, 12), createdAt: at(-34, 9) });
        await order({ buyer: "claire_crafts", seller: "maya_makes", title: "Product #1", price: 18, status: "scheduled", method: "cash", paid: false, location: "Campus Library, 2nd Floor", pickupAt: at(0, 14) });
        await order({ buyer: "leo_ceramics", seller: "maya_makes", title: "San Luis Obispo Mug", price: 26, status: "ready", method: "card", paid: true, location: "Dexter Lawn", pickupAt: at(2, 16, 15), pin: "1357" });
        await client.query("insert into reviews (order_item_id, rating, content) values ($1, 5, 'Sturdy and beautifully made.')", [toteItem]);

        const tagIds = {};
        for (const [index, [author, type, caption, tags]] of posts.entries()) {
            const row = await insert(
                "insert into posts (author_id, type, caption, media_url, created_at) values ($1, $2, $3, $4, now() - make_interval(hours => $5)) returning id",
                [userIds[author], type, caption, placeholderMedia(type, index + 1), index * 5]
            );
            for (const tag of tags) {
                tagIds[tag] ??= (await insert(
                    "insert into tags (name) values ($1) on conflict (name) do update set name = excluded.name returning id",
                    [tag]
                )).id;
                await client.query("insert into post_tags (post_id, tag_id) values ($1, $2)", [row.id, tagIds[tag]]);
            }
            for (const fan of Object.values(userIds).slice(0, (index % 5) + 2)) {
                if (fan !== userIds[author]) {
                    await client.query("insert into post_likes (user_id, post_id) values ($1, $2)", [fan, row.id]);
                }
            }
            await client.query(
                "insert into post_comments (post_id, author_id, content) values ($1, $2, 'This is so lovely!'), ($1, $3, 'Saving this for inspiration.')",
                [row.id, userIds.claire_crafts, userIds.leo_ceramics]
            );
        }

        const event = async ({ title, description, location, startsAt, endsAt, host, vendors = [], rsvps = [] }) => {
            const row = await insert(
                `insert into events (campus_id, location_id, created_by, host_store_id, title, description, starts_at, ends_at)
                 values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
                [campusId, locationIds[location], host ? userIds[host] : demo, host ? storeIds[host] : null, title, description, startsAt, endsAt]
            );
            for (const [seller, booth] of vendors) {
                await client.query("insert into event_vendors (event_id, store_id, booth) values ($1, $2, $3)", [row.id, storeIds[seller], booth]);
            }
            for (const [user, status] of rsvps) {
                await client.query("insert into event_rsvps (event_id, user_id, status) values ($1, $2, $3)", [row.id, userIds[user], status]);
            }
        };

        await event({ title: "Dexter Lawn Fall Artisan Market", description: "Discover handmade goods from student creators.", location: "Dexter Lawn", startsAt: at(4, 11), endsAt: at(4, 15), host: "campus_creations", vendors: [["maya_makes", "Booth #4"], ["slo_clay", "Booth #7"]], rsvps: [["demo", "going"], ["claire_crafts", "interested"]] });
        await event({ title: "Ceramics Kiln Firing & Live Demo", description: "Learn pottery techniques with campus makers.", location: "Dexter Art Studio 102", startsAt: at(5, 13), endsAt: at(5, 15), host: "maya_makes", rsvps: [["demo", "interested"], ["leo_ceramics", "going"]] });
        await event({ title: "Autumn Makers Meetup", description: "Meet other makers on campus.", location: "University Union", startsAt: at(-16, 17), endsAt: at(-16, 19), rsvps: [["demo", "going"]] });
        await event({ title: "Clay & Coffee Workshop", description: "Hand-building basics over coffee.", location: "Art & Design Building", startsAt: at(-28, 10), endsAt: at(-28, 12), host: "slo_clay", rsvps: [["demo", "going"]] });

        await client.query(
            "insert into messages (sender_id, receiver_id, content) values ($1, $2, 'Hi! Is the mug still available in blue?'), ($2, $1, 'Yes! I can bring it to the library tomorrow.')",
            [demo, userIds.maya_makes]
        );
    });

    console.log(`Seeded demo data. Sign in as demo@calpoly.edu or maya_makes@calpoly.edu with password ${PASSWORD}`);
};

try {
    await run();
} finally {
    await pool.end();
}
