// Opt-in integration check against a running local server and configured database.
// Creates uniquely named fixtures, then removes only those fixtures in finally.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
await import("./env.js");
const { default: pool } = await import("../src/db/pool.js");
const base = "http://localhost:8787";
const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const users = [];
let campusId, uploadedKey;
async function call(path, user, method = "GET", body) {
    const response = await fetch(`${base}/api${path}`, {
        method,
        headers: {
            Origin: base,
            ...(user
                ? { Authorization: `Bearer ${user.token}` }
                : {}),
            ...(body && !(body instanceof FormData)
                ? { "Content-Type": "application/json" }
                : {})
        },
        body:
            body instanceof FormData
                ? body
                : body
                  ? JSON.stringify(body)
                  : undefined
    });
    const data = await response.json().catch(() => null);
    return {
        status: response.status,
        data,
        token: response.headers.get("set-auth-token")
    };
}
async function account(role) {
    const username = `cmcheck_${role}_${suffix}`;
    const r = await call("/auth/sign-up/email", null, "POST", {
        name: "Integration check",
        username,
        email: `${username}@example.invalid`,
        password: randomUUID()
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const u = {
        id: r.data.user.id,
        username,
        token: r.token || r.data.token
    };
    users.push(u);
    return u;
}
try {
    const seller = await account("seller"),
        buyer = await account("buyer"),
        admin = await account("admin");
    await pool.query(
        "update users set role='admin' where id=$1",
        [admin.id]
    );
    campusId = (
        await pool.query(
            "insert into campuses (name,email_domain) values ($1,$2) returning id",
            [`Check ${suffix}`, `${suffix}.example.edu`]
        )
    ).rows[0].id;
    await pool.query(
        "insert into stores (owner_id,campus_id,name,school_email,verified_at) values ($1,$2,$3,$4,now())",
        [
            seller.id,
            campusId,
            "Test maker",
            `${suffix}@example.edu`
        ]
    );
    assert.equal(
        (await call("/admin/queue", buyer)).status,
        403
    );
    assert.equal((await call("/admin/queue")).status, 401);
    const search = await call(
        `/users?search=${buyer.username}`,
        seller
    );
    assert.equal(search.status, 200);
    assert.ok(search.data.data.some((u) => u.id === buyer.id));
    assert.equal(
        (
            await call(
                `/follows/${seller.username}`,
                buyer,
                "PUT"
            )
        ).status,
        204
    );
    const connections = await call(
        `/users/by-id/${seller.id}/connections`,
        buyer
    );
    assert.equal(connections.status, 200);
    assert.equal(connections.data.data.isFollowing, true);
    assert.ok(
        connections.data.data.followers.some(
            (person) => person.id === buyer.id
        )
    );
    const message = await call("/messages", seller, "POST", {
        recipientUsername: buyer.username,
        content: "Integration message"
    });
    assert.equal(
        message.status,
        201,
        JSON.stringify(message.data)
    );
    const inbox = await call(
        `/conversations/${seller.username}`,
        buyer
    );
    assert.ok(
        inbox.data.data.messages.some(
            (m) => m.content === "Integration message"
        )
    );
    assert.equal(
        (
            await call(
                `/conversations/${seller.username}/read`,
                buyer,
                "PUT"
            )
        ).status,
        204
    );
    const created = await call("/posts", seller, "POST", {
        type: "text",
        caption: "Integration post"
    });
    assert.equal(
        created.status,
        201,
        JSON.stringify(created.data)
    );
    const postId = created.data.data.id;
    assert.equal((await call(`/posts/${postId}`)).status, 404);
    assert.equal(
        (await call(`/posts/${postId}/like`, buyer, "PUT"))
            .status,
        404
    );
    assert.equal(
        (
            await call(
                `/admin/posts/${postId}`,
                admin,
                "PATCH",
                { status: "approved" }
            )
        ).status,
        200
    );
    assert.equal((await call(`/posts/${postId}`)).status, 200);
    assert.equal(
        (await call(`/posts/${postId}/like`, null, "PUT"))
            .status,
        401
    );
    assert.equal(
        (await call(`/posts/${postId}/like`, buyer, "PUT"))
            .status,
        200
    );
    assert.equal(
        (
            await call(
                `/posts/${postId}/comments`,
                buyer,
                "POST",
                { content: "Test comment" }
            )
        ).status,
        201
    );
    assert.equal(
        (
            await call(`/posts/${postId}`, buyer, "PATCH", {
                type: "text",
                caption: "Unauthorized edit"
            })
        ).status,
        404
    );
    const listing = await call("/listings", seller, "POST", {
        title: "Integration listing",
        price: 2,
        quantity: 3
    });
    assert.equal(
        listing.status,
        201,
        JSON.stringify(listing.data)
    );
    const listingId = listing.data.data.id;
    assert.equal(
        (await call(`/listings/${listingId}`)).status,
        404
    );
    assert.equal(
        (
            await call("/orders", buyer, "POST", {
                items: [{ listingId, quantity: 1 }],
                paymentMethod: "cash"
            })
        ).status,
        409
    );
    assert.equal(
        (
            await call(
                `/admin/listings/${listingId}`,
                admin,
                "PATCH",
                { status: "approved" }
            )
        ).status,
        200
    );
    assert.equal(
        (await call(`/listings/${listingId}`)).status,
        200
    );
    assert.equal(
        (
            await call(
                `/listings/${listingId}/activity/rating`,
                buyer,
                "PUT",
                { rating: 5 }
            )
        ).status,
        200
    );
    assert.equal(
        (
            await call(
                `/listings/${listingId}/activity/comments`,
                buyer,
                "POST",
                { content: "Listing comment" }
            )
        ).status,
        201
    );
    const order = await call("/orders", buyer, "POST", {
        items: [{ listingId, quantity: 1 }],
        paymentMethod: "cash"
    });
    assert.equal(order.status, 201, JSON.stringify(order.data));
    assert.equal(
        (
            await call(`/posts/${postId}`, seller, "PATCH", {
                type: "text",
                caption: "Edited post"
            })
        ).status,
        200
    );
    assert.equal((await call(`/posts/${postId}`)).status, 404);
    const announcement = await call(
        "/admin/announcements",
        admin,
        "POST",
        { caption: "Integration announcement", pinned: true }
    );
    assert.equal(announcement.status, 201);
    assert.equal(
        (await call(`/posts/${announcement.data.data.id}`)).data
            .data.pinned,
        true
    );
    console.log(
        "PASS: search, messaging, read receipts, authorization, moderation, comments, likes, ratings, ordering, re-review and announcements."
    );
    const form = new FormData();
    form.append(
        "file",
        new Blob(
            [
                Buffer.from(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nZkAAAAASUVORK5CYII=",
                    "base64"
                )
            ],
            { type: "image/png" }
        ),
        "test.png"
    );
    const uploaded = await call(
        "/uploads",
        seller,
        "POST",
        form
    );
    if (uploaded.status !== 201)
        throw new Error(
            `R2 upload check: ${JSON.stringify(uploaded.data)}`
        );
    uploadedKey = uploaded.data.data.key;
    const mediaPost = await call("/posts", seller, "POST", {
        type: "image",
        caption: "Media test",
        mediaUrl: uploaded.data.data.url
    });
    assert.equal(mediaPost.status, 201);
    assert.equal(
        (await fetch(uploaded.data.data.url)).status,
        404
    );
    assert.equal(
        (
            await call(
                `/admin/posts/${mediaPost.data.data.id}`,
                admin,
                "PATCH",
                { status: "approved" }
            )
        ).status,
        200
    );
    assert.equal(
        (await fetch(uploaded.data.data.url)).status,
        200
    );
    console.log(
        "PASS: R2 upload, private pending media, approved photo retrieval."
    );
} finally {
    if (uploadedKey && users[0])
        await call(
            `/uploads/${uploadedKey}`,
            users[0],
            "DELETE"
        );
    const ids = users.map((u) => u.id);
    if (ids.length) {
        await pool.query(
            "delete from orders where buyer_id=any($1::text[])",
            [ids]
        );
        await pool.query(
            "delete from users where id=any($1::text[])",
            [ids]
        );
    }
    if (campusId)
        await pool.query("delete from campuses where id=$1", [
            campusId
        ]);
    await pool.end();
}
