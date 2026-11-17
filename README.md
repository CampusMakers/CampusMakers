# Campus Makers _ CSC3100

### Roles
* **Scrum Master:** Sai Deekshitha
* **Product Manager:** Celeste
* **Lead Engineer:** Jarek
* **Tester:** Hunter


### TE6 : SEQUENCE DIAGRAM
https://github.com/CampusMakers/CampusMakers/blob/main/SRD/TE6-SequenceDiagrams.pdf

### Local development and community features

Run `npm run dev` from the repository root and open http://localhost:8787.
For Vite hot reload, also run `npm run dev -w frontend` and open port 5173.
Both use the same backend. Restart Wrangler after changing `.dev.vars`.

Apply the community migration on each environment before deploying this version:

```sh
node backend/scripts/migrate-community.js
```

Existing and new posts/listings begin pending approval. Editing content or listing
images sends it back for review. Registered administrators can approve/reject
content and publish pinned community announcements from Profile → Admin Mode.
Use Profile → Admin Mode → Manage administrators to search registered accounts and grant or remove admin access. The last administrator cannot be removed. For initial setup, use `node backend/scripts/grant-admin.js USERNAME`.

Photos are stored in private Cloudflare R2. Configure `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET` in `.dev.vars` locally
and the equivalent Worker secrets/settings in production. The R2 token needs
object list/read/write/delete access. No public bucket URL is needed for new
uploads. Pending post/listing photos are private to their owner and admins.

All app uploads share a hard limit of 10,000,000,000 bytes across the configured
bucket (including old/unattached objects and video). The backend serializes
checks using PostgreSQL and counts every R2 object before uploading. Uploads made
outside this app bypass its limit; keep bucket writes restricted to this backend.
Old browser-only demo posts/photos are not automatically migrated.

Messaging uses registered accounts, database persistence, and a five-second
refresh interval. Orders use the backend stock/price checks; payments are arranged
with the seller, not charged online. Sample content remains a read-only preview.

Validation:

```sh
node --experimental-test-module-mocks --test backend/src/lib/*.test.js backend/src/services/*.test.js backend/src/routes/*.test.js frontend/src/services/*.test.js
npm run build
```

`node backend/scripts/check-community.js` is an opt-in check against the local
server and configured database/R2 bucket. It creates uniquely named temporary
accounts and content, exercises messaging/moderation/orders/photos, and removes
its own fixtures afterward. `node backend/scripts/check-storage.js` checks R2
configuration without printing credentials.
