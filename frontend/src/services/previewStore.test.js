import test from "node:test";
import assert from "node:assert/strict";
import { previewStore } from "./previewStore.js";
const memory = new Map();
globalThis.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
};
globalThis.window = new EventTarget();
let posts = [];
let unavailable = false;
globalThis.fetch = async (url, options = {}) => {
    if (unavailable) throw new Error("Server unavailable");
    const id = Number(String(url).match(/posts\/(\d+)/)?.[1]);
    let result;
    const body = options.body ? JSON.parse(options.body) : null;
    if (options.method === "POST") {
        result = {
            id: posts.length + 1,
            author: {
                id: "preview-user",
                username: "username"
            },
            moderationStatus: "pending",
            ...body
        };
        posts.push(result);
    } else if (options.method === "PATCH") {
        result = posts.find((p) => p.id === id);
        Object.assign(result, body);
    } else if (options.method === "DELETE") {
        posts = posts.filter((p) => p.id !== id);
        return new Response(null, { status: 204 });
    } else result = posts;
    return Response.json({ data: result });
};
test.beforeEach(() => {
    memory.clear();
    posts = [];
    unavailable = false;
});
test("published posts survive reads, editing and string-id deletion", async () => {
    const { data: post } = await previewStore
        .from("maker_posts")
        .insert({ seller_id: "preview-user", caption: "First" })
        .select()
        .single();
    assert.ok(post.id);
    await previewStore
        .from("maker_posts")
        .update({ caption: "Updated" })
        .eq("id", String(post.id));
    assert.equal(
        (
            await previewStore
                .from("maker_posts")
                .select()
                .single()
        ).data.caption,
        "Updated"
    );
    const deleted = await previewStore
        .from("maker_posts")
        .delete()
        .eq("id", String(post.id))
        .select("id");
    assert.equal(deleted.data.length, 1);
    assert.equal(
        (await previewStore.from("maker_posts").select()).data
            .length,
        0
    );
});
test("follow lists resolve profile names and count saved relationships", async () => {
    const person = (
        await previewStore.from("messaging_profiles").select()
    ).data[1];
    await previewStore
        .from("maker_follows")
        .insert({
            follower_id: "preview-user",
            followee_id: person.id
        });
    const result = await previewStore
        .from("maker_follows")
        .select()
        .eq("follower_id", "preview-user");
    assert.equal(result.count, 1);
    assert.equal(
        result.data[0].followee.username,
        person.username
    );
});
test("ratings replace the previous rating instead of adding duplicate votes", async () => {
    for (const rating of [2, 5])
        await previewStore
            .from("maker_product_ratings")
            .upsert(
                {
                    product_id: "listing-1",
                    user_id: "preview-user",
                    rating
                },
                { onConflict: "product_id,user_id" }
            );
    const result = await previewStore
        .rpc("maker_product_rating_summary", {
            p_product_id: "listing-1"
        })
        .single();
    assert.deepEqual(result.data, {
        average_rating: 5,
        rating_count: 1,
        own_rating: 5
    });
});
test("settings finds comments for owned posts and deletion removes replies", async () => {
    const { data: root } = await previewStore
        .from("maker_post_comments")
        .insert({
            post_id: 7,
            author_id: "preview-user",
            content: "Hello"
        })
        .single();
    await previewStore
        .from("maker_post_comments")
        .insert({
            post_id: 7,
            parent_id: root.id,
            content: "Reply"
        });
    assert.equal(
        (
            await previewStore
                .from("maker_post_comments")
                .select()
                .in("post_id", [7])
        ).data.length,
        2
    );
    await previewStore
        .from("maker_post_comments")
        .delete()
        .eq("id", root.id);
    assert.equal(
        (
            await previewStore
                .from("maker_post_comments")
                .select()
        ).data.length,
        0
    );
});
test("ending an event requires confirmation and prevents later edits", async () => {
    const { data: post } = await previewStore
        .from("maker_posts")
        .insert({ is_event: true })
        .single();
    const args = {
        p_id: post.id,
        p_changes: { event_status: "Event Ended" }
    };
    assert.ok(
        (await previewStore.rpc("update_maker_event", args))
            .error
    );
    assert.equal(
        (
            await previewStore.rpc("update_maker_event", {
                ...args,
                p_confirm_finished: true
            })
        ).error,
        null
    );
    assert.ok(
        (
            await previewStore.rpc("update_maker_event", {
                p_id: post.id,
                p_changes: { caption: "Edit" }
            })
        ).error
    );
});
test("server failures are reported rather than storing posts only in the browser", async () => {
    unavailable = true;
    assert.match(
        (
            await previewStore
                .from("maker_posts")
                .insert({ caption: "x" })
        ).error.message,
        /Server unavailable/
    );
    assert.equal(memory.size, 0);
});
