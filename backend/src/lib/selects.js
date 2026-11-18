const userJson = (alias) =>
    `json_build_object('id', ${alias}.id, 'username', ${alias}.username, 'name', ${alias}.name, 'image', ${alias}.image)`;

export const listingSelect = (params, viewerId) => `
    select
        l.id,
        l.moderation_status as "moderationStatus",
        l.title,
        l.description,
        l.type,
        l.quantity,
        l.price,
        case
            when l.inactive_since is not null or s.inactive_since is not null then 'inactive'
            when l.quantity = 0 then 'sold_out'
            else 'active'
        end as status,
        l.created_at as "createdAt",
        l.updated_at as "updatedAt",
        case when c.id is null then null else json_build_object('id', c.id, 'name', c.name) end as category,
        json_build_object('id', s.id, 'name', s.name, 'campusId', s.campus_id, 'owner', ${userJson("u")}) as store,
        coalesce((
            select json_agg(json_build_object('id', i.id, 'url', i.url, 'position', i.position) order by i.position, i.id)
            from listing_images i
            where i.listing_id = l.id
        ), '[]'::json) as images,
        ${viewerId ? `exists (select 1 from saved_listings sl where sl.listing_id = l.id and sl.user_id = ${params.add(viewerId)})` : "false"} as "isSaved",
        count(*) over ()::int as "totalCount"
    from listings l
    join stores s on s.id = l.store_id
    join users u on u.id = s.owner_id
    left join categories c on c.id = l.category_id`;

export const activeListing =
    "l.inactive_since is null and s.inactive_since is null and l.moderation_status = 'approved'";

export const postSelect = (params, viewerId) => `
    select
        po.id,
        po.moderation_status as "moderationStatus",
        po.pinned, po.announcement, po.metadata,
        po.type,
        po.caption,
        po.media_url as "mediaUrl",
        po.created_at as "createdAt",
        ${userJson("a")} as author,
        coalesce((
            select json_agg(t.name order by t.name)
            from post_tags pt
            join tags t on t.id = pt.tag_id
            where pt.post_id = po.id
        ), '[]'::json) as tags,
        (select count(*) from post_likes pl where pl.post_id = po.id)::int as "likeCount",
        (select count(*) from post_comments pc where pc.post_id = po.id)::int as "commentCount",
        ${viewerId ? `exists (select 1 from post_likes ml where ml.post_id = po.id and ml.user_id = ${params.add(viewerId)})` : "false"} as "likedByMe",
        count(*) over ()::int as "totalCount"
    from posts po
    join users a on a.id = po.author_id`;

export const orderSelect = (params, viewerId) => {
    const viewer = params.add(viewerId);
    return `
    select
        o.id,
        'CM-' || o.id as "orderNumber",
        o.status,
        o.payment_method as "paymentMethod",
        o.paid_at as "paidAt",
        o.pickup_at as "pickupAt",
        o.created_at as "createdAt",
        o.updated_at as "updatedAt",
        case when o.buyer_id = ${viewer} then 'buyer' else 'seller' end as "viewerRole",
        case when o.buyer_id = ${viewer} and o.status = 'ready' then o.pickup_pin end as "pickupPin",
        case when loc.id is null then null
            else json_build_object('id', loc.id, 'name', loc.name, 'address', loc.address) end as "pickupLocation",
        case when b.id is null then null else ${userJson("b")} end as buyer,
        case when s.id is null then null
            else json_build_object('id', s.id, 'name', s.name, 'owner', ${userJson("so")}) end as store,
        lines.items,
        lines.total,
        count(*) over ()::int as "totalCount"
    from orders o
    left join users b on b.id = o.buyer_id
    left join stores s on s.id = o.store_id
    left join users so on so.id = s.owner_id
    left join locations loc on loc.id = o.pickup_location_id
    cross join lateral (
        select
            coalesce(json_agg(json_build_object(
                'id', oi.id,
                'listingId', oi.listing_id,
                'title', oi.title,
                'quantity', oi.quantity,
                'unitPrice', oi.unit_price,
                'image', (select i.url from listing_images i where i.listing_id = oi.listing_id order by i.position, i.id limit 1),
                'review', case when r.order_item_id is null then null
                    else json_build_object('rating', r.rating, 'content', r.content, 'createdAt', r.created_at) end
            ) order by oi.id), '[]'::json) as items,
            coalesce(sum(oi.quantity * oi.unit_price), 0) as total
        from order_items oi
        left join reviews r on r.order_item_id = oi.id
        where oi.order_id = o.id
    ) lines`;
};

export const eventSelect = (params, viewerId) => {
    const viewer = viewerId ? params.add(viewerId) : null;
    return `
    select
        e.id,
        e.title,
        e.description,
        e.starts_at as "startsAt",
        e.ends_at as "endsAt",
        e.campus_id as "campusId",
        case when loc.id is null then null
            else json_build_object(
                'id', loc.id, 'name', loc.name, 'address', loc.address,
                'city', loc.city, 'state', loc.state, 'zip', loc.zip,
                'latitude', loc.latitude, 'longitude', loc.longitude,
                'approximate', coalesce(loc.coordinates_source = 'approximate', false)
            ) end as location,
        case when hs.id is null then null else json_build_object('id', hs.id, 'name', hs.name, 'ownerId', hs.owner_id) end as host,
        case when cu.id is null then null else ${userJson("cu")} end as creator,
        (select count(*) from event_rsvps r where r.event_id = e.id and r.status = 'going')::int as "goingCount",
        (select count(*) from event_rsvps r where r.event_id = e.id and r.status = 'interested')::int as "interestedCount",
        coalesce((
            select json_agg(json_build_object('storeId', vs.id, 'storeName', vs.name, 'booth', ev.booth) order by vs.name)
            from event_vendors ev
            join stores vs on vs.id = ev.store_id
            where ev.event_id = e.id
        ), '[]'::json) as vendors,
        ${viewer ? `(select r.status from event_rsvps r where r.event_id = e.id and r.user_id = ${viewer})` : "null"} as "myRsvp",
        ${
            viewer
                ? `case
            when hs.owner_id = ${viewer} then 'host'
            when exists (
                select 1 from event_vendors ev join stores vs on vs.id = ev.store_id
                where ev.event_id = e.id and vs.owner_id = ${viewer}
            ) then 'vendor'
        end`
                : "null"
        } as "myRole",
        count(*) over ()::int as "totalCount"
    from events e
    left join locations loc on loc.id = e.location_id
    left join stores hs on hs.id = e.host_store_id
    left join users cu on cu.id = e.created_by`;
};

export const messageColumns = `
    m.id,
    m.sender_id as "senderId",
    m.receiver_id as "receiverId",
    m.content,
    m.created_at as "createdAt",
    m.read_at as "readAt"`;
