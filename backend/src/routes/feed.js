import { Router } from "express";
import { z } from "zod";
import { many } from "../db/pool.js";
import { id } from "../lib/schemas.js";
import {
    activeListing,
    listingSelect
} from "../lib/selects.js";
import { Params, withoutTotal } from "../lib/sql.js";
import validate from "../middleware/validate.js";

const router = Router();

const recentListings = (viewerId, campusId, limit) => {
    const params = new Params();
    const select = listingSelect(params, viewerId);
    const campus = campusId
        ? `and s.campus_id = ${params.add(campusId)}`
        : "";
    return many(
        `${select} where ${activeListing} ${campus}
         order by l.created_at desc limit ${params.add(limit)}`,
        params.values
    );
};

const followedListings = (viewerId, limit) => {
    const params = new Params();
    const select = listingSelect(params, viewerId);
    return many(
        `${select}
         where ${activeListing}
           and exists (select 1 from follows f where f.followee_id = s.owner_id and f.follower_id = ${params.add(viewerId)})
         order by l.created_at desc limit ${params.add(limit)}`,
        params.values
    );
};

const suggestedCreators = (viewerId, campusId, limit) =>
    many(
        `select
             u.id,
             u.username,
             u.name,
             u.image,
             json_build_object('id', s.id, 'name', s.name) as store,
             (select count(*) from follows f where f.followee_id = u.id)::int as "followerCount",
             (select i.url from listing_images i join listings l on l.id = i.listing_id
              where l.store_id = s.id and l.inactive_since is null and l.moderation_status = 'approved'
              order by l.created_at desc, i.position limit 1) as "coverImage"
         from users u
         join stores s on s.owner_id = u.id and s.inactive_since is null
         where ($1::text is null or u.id <> $1)
           and ($2::bigint is null or s.campus_id = $2)
           and ($1::text is null or not exists (
               select 1 from follows f where f.follower_id = $1 and f.followee_id = u.id
           ))
         order by "followerCount" desc, s.created_at desc
         limit $3`,
        [viewerId, campusId, limit]
    );

router.get(
    "/",
    validate({
        query: z.object({
            campusId: id.optional(),
            limit: z.coerce
                .number()
                .int()
                .min(1)
                .max(30)
                .default(12)
        })
    }),
    async (req, res) => {
        const viewerId = req.user?.id ?? null;
        const campusId =
            req.data.query.campusId ??
            req.user?.campusId ??
            null;
        const { limit } = req.data.query;
        const [listings, fromCreators, creators] =
            await Promise.all([
                recentListings(viewerId, campusId, limit),
                viewerId
                    ? followedListings(viewerId, limit)
                    : [],
                suggestedCreators(viewerId, campusId, limit)
            ]);
        res.json({
            data: {
                listings: listings.map(withoutTotal),
                fromYourCreators:
                    fromCreators.map(withoutTotal),
                suggestedCreators: creators
            }
        });
    }
);

export default router;
