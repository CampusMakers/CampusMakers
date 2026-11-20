# Campus Makers — Automated Testing

CSC 3100 · TE7

## Part I: Test-Driven Development (TDD)

### Requirement and feature

**Explore request:** Differentiate upcoming, current, and completed event posts.

Explore cards previously displayed only “EVENT,” even though the existing `eventStatusAt` helper already calculated event status correctly. This change displays **Upcoming**, **In Progress**, or **Completed** on event cards and event details. Blue, green, and gray badges supplement the text, so color is not the only indication. Automatic statuses refresh while the page remains open; manual status selections and explicitly ended events retain their existing behavior.

- **Production files:** `frontend/src/pages/Explore Page/Explore.jsx` and `Explore.css`.
- **Existing logic reused:** `frontend/src/services/eventStatus.js`.
- **New test file:** `frontend/tests/exploreEventStatus.test.js`.
- **Tools:** Node.js `node:test` / `node:assert`, React server rendering, and Vite's JSX loader.
- **Verified runtime:** Node.js v26.9.0.

### Red — write failing tests before changing the display

Four component-rendering tests were added first: upcoming, in-progress, completed, and a non-event post. They render the actual `PostCard` component and inspect its visible text. Dates far in the past/future make the automatic status scenarios independent of the current day.

Representative completed-event assertion (full fixtures and setup are in the test file):

```js
const html = renderToStaticMarkup(createElement(PostCard, {
    post: {
        ...base,
        event_starts_at: '2000-01-01',
        event_ends_at: '2000-01-02'
    },
    onOpenPost() {},
    onOpenSeller() {}
}));
assert.ok(html.includes('>Completed</span>'));
```

Command:

```bash
node --test frontend/tests/exploreEventStatus.test.js
```

**Actual Red result: 1 passed, 3 failed.** Each event assertion failed because its label was absent; the ordinary-post test passed. The returned event markup contained `<span>EVENT</span>` but no status. These were assertion failures, not failures in the existing date calculation.

Recorded output (summary excerpt):

```text
✖ Explore event card visibly identifies Upcoming events (74.278458ms)
✖ Explore event card visibly identifies In Progress events (0.368458ms)
✖ Explore event card visibly identifies Completed events (0.258333ms)
✔ ordinary Explore posts do not display an event status badge (0.374083ms)
ℹ tests 4
ℹ suites 0
ℹ pass 1
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 258.489625
```

Recorded completed-event failure:

```text
AssertionError [ERR_ASSERTION]: Expected visible Completed badge; received <article class="explore-card wide text" role="link" tabindex="0"><div class="explore-card-body"><div class="event-card-bar"><span>EVENT</span><strong>Campus market</strong></div><p class="explore-caption preview">Campus market</p></div></article>
```

[Full Red output](tdd-evidence/explore-red.txt)

### Green — implement the smallest change

Imported `eventStatusAt` into Explore, calculated the card's status, and rendered a status span beside “EVENT.” The existing internal value `Event Ended` is displayed as **Completed**.

```jsx
const eventStatus = eventStatusAt(post);
// Inside the event card header:
<span className="event-status-badge">
    {eventStatus === "Event Ended" ? "Completed" : eventStatus}
</span>
```

**Actual Green result: all 4 component tests passed.**

Command used:

```bash
node --test frontend/tests/exploreEventStatus.test.js
```

Recorded output:

```text
✔ Explore event card visibly identifies Upcoming events (66.392459ms)
✔ Explore event card visibly identifies In Progress events (0.264917ms)
✔ Explore event card visibly identifies Completed events (0.137125ms)
✔ ordinary Explore posts do not display an event status badge (0.314125ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 249.24875
```

[Full Green output](tdd-evidence/explore-green.txt)

### Refactor — reuse the presentation and keep tests passing

Extracted a shared `EventStatusBadge` component used by both the card and event-details header. It reuses the existing date/status helper, updates its clock every second, and clears the timer when unmounted. Added distinct badge colors and wrapping for narrow card headers.

**Actual final result: all 17 tests passed** (13 existing service tests and 4 new component tests). The frontend production build also passed.

Command used:

```bash
npm test
```

Recorded output:

```text
> CampusMakers@0.1.0 test
> node --test frontend/src/services/*.test.js frontend/tests/*.test.js

✔ scheduled times use the creator's zone and omit seconds (10.286667ms)
✔ the zone abbreviation follows daylight saving time (0.1945ms)
✔ legacy records identify the viewer-zone fallback (0.142458ms)
✔ automatic event status changes at the start and end boundaries (0.84425ms)
✔ manual status stays as selected and finished status stays finished (0.060166ms)
✔ published posts survive reads, editing and string-id deletion (1.429ms)
✔ follow lists resolve profile names and count saved relationships (0.304375ms)
✔ ratings replace the previous rating instead of adding duplicate votes (0.537708ms)
✔ settings finds comments for owned posts and deletion removes replies (0.203166ms)
✔ ending an event requires confirmation and prevents later edits (0.175167ms)
✔ storage failures are reported rather than claiming a successful publish (0.143667ms)
✔ quantity choices respect the seller limit and available stock (0.334125ms)
✔ suggestions exclude the current product, posts and duplicate listings (0.352917ms)
✔ Explore event card visibly identifies Upcoming events (68.207042ms)
✔ Explore event card visibly identifies In Progress events (0.257583ms)
✔ Explore event card visibly identifies Completed events (0.139792ms)
✔ ordinary Explore posts do not display an event status badge (0.29125ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 274.98025
```

[Full Refactor output](tdd-evidence/explore-refactor.txt)

### Install and run

From the repository root, install the root and frontend dependencies if they are not already installed:

```bash
npm ci
npm ci --prefix frontend
npm run test:tdd
npm test
npm run build --prefix frontend
```

`npm run test:tdd` runs the four Explore component tests. `npm test` runs the currently checked-in service and component tests. No credentials, seed database, external services, or running web server are needed. Vite loads the real JSX component in middleware mode with its WebSocket server disabled.

### Scope and limitations

This replaces the previous recommendation-tag TDD example. Existing non-TDD documentation below is retained and may describe another branch's tests. These component-rendering checks verify visible status labels, but do not validate CSS appearance, live timer behavior in a browser, or a complete user-interaction story. They do not replace the assignment's two complete-story UI tests. Image enlargement and saving listings/posts remain separate Explore requests and are not implemented by this change.

## Part II: Unit Testing

Unit tests verify a small unit of code in isolation, such as a
function, service method, or validation rule. The assignment
requires **at least four unit tests across at least two
different units of code**.

**Tools:** Node.js built-in `node:test` and `node:assert`.

The existing notes identify the following cases. Confirm the
corresponding assertions and results in the current branch
before submission.

| Test | Unit and test file                                                       | Behavior and expected outcome                                                           |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1    | Seller registration — `frontend/src/services/sellerRegistration.test.js` | A valid campus email is accepted regardless of letter case or surrounding whitespace.   |
| 2    | Seller registration — `frontend/src/services/sellerRegistration.test.js` | An address with a misleading university-like domain is rejected.                        |
| 3    | Cart model — `frontend/src/services/cartModel.test.js`                   | Adding the same product increases its quantity without exceeding the maximum per order. |
| 4    | Cart model — `frontend/src/services/cartModel.test.js`                   | Cart quantities cannot exceed available stock.                                          |

Additional documented cases include missing school domains,
invalid email addresses, invalid products, mixed-seller carts,
quantity changes, and guest separation. Other test files include
`sellerVerificationTokens.test.js`, `profilePhotos.test.js`,
`profilePhotoBlob.test.js`, `sellerListingValidation.test.js`,
and email-service tests with mocked provider calls.

**Pending:** Confirm that the current suite contains at least
four distinct tests across the two units and record their
results.

## Part III: System Testing

System tests verify that multiple application components work
together to complete a feature. For this assignment, each system
test must exercise **at least two functions or methods that make
up one feature**. At least **two system tests** are required.

**Tools:** Node.js test runner, Supertest, and dependency mocks.

**Candidate suite:**
`backend/src/routes/storesVerification.test.js`.

| Test                        | Scenario                                                                           | Expected outcome                                                       |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1 — Authorization           | A signed-in user attempts to confirm another user's university email verification. | The request is rejected and the other user's store is not approved.    |
| 2 — Single-use verification | A valid verification request is submitted, then the same token is reused.          | The first request confirms the seller; the second request is rejected. |

These scenarios combine HTTP request handling with
seller-verification rules and mocked supporting services or data
access. Other documented cases cover expired tokens, storing
token hashes instead of raw tokens, and cleanup after email
delivery fails.

**Pending:** Identify the actual functions or methods exercised
by each required test, confirm that at least two work together
in each scenario, and record the passing results. Confirm the
current behavior of newer route suites, including
`adminMembers.test.js` and `uploadPhotos.test.js`.

**Limitation:** Mocked database and email dependencies do not
establish that a real database or external email provider works
correctly.

## Part IV: UI Testing

UI tests simulate user interactions and assert what a person can
see or do. The assignment requires **at least two automated UI
tests covering at least one complete user story**. Manual
browser checks do not replace this requirement.

**Status: Complete — two React Testing Library tests pass for the
Home and Explore discovery-to-detail paths.**

| Item                | Team evidence                                                 |
| ------------------- | ------------------------------------------------------------- |
| Owner(s)            | Not specified |
| Selected framework  | React Testing Library, `user-event`, jsdom, Node.js test runner, and Vite's JSX loader |
| Test files          | `frontend/tests/listingDiscovery.ui.test.js` |
| Run command         | `npm run test:ui` from the repository root |
| Application startup | None; tests render the React `App` in jsdom |
| Seed or mock setup  | Each test seeds `Campus Test Mug` as a published listing in the browser-local `maker_posts` preview store; no account or credentials |
| Cleanup             | React tree unmounted and jsdom local storage cleared after each test; no server records created |

### User story covered

> As a buyer, I want to discover and open a published Campus
> Makers listing so I can inspect a product.

| Test                  | User actions                                                             | Visible assertions                                                                                              |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1 — Home discovery    | Open Home, locate `Campus Test Mug`, and click its card. | The card is visible; Product Detail shows its title, description, Ceramics category, $28.00 price, and Back to Home button. |
| 2 — Explore discovery | Open Explore, filter to Products, locate the same listing, and click its card. | The card is visible; Product Detail shows the same title, description, category, price, and Back to Explore button. |

Both tests render the real React `App`, simulate clicks, and assert
visible DOM content. The listing is seeded into the frontend's
browser-local preview store, so both pages read the same published
preview record. These tests cover the current UI flow; they do not
verify a live backend, browser layout, or image loading.

## Test Tools

| Testing level | Tool                                                            | Status and scope                                                            |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| TDD | Node.js test runner, React server rendering, Vite | Complete: Explore event-status badges; see Part I. |
| Unit          | Node.js `node:test` and `node:assert`                           | Existing tests for isolated functions and services.                         |
| System        | Node.js test runner, Supertest, and dependency mocks            | Candidate API-route tests combining request handling and feature logic.     |
| UI            | React Testing Library, `user-event`, jsdom, Node.js, Vite | Two automated Home/Explore discovery-to-detail tests; see Part IV. |

## Installing Dependencies and Running Tests

Run the commands below from the repository root,
`CampusMakers/`.

### Prerequisites

1. Install **Node.js 24** and npm. The previously inspected
   GitHub Actions workflow on `main` used Node 24; confirm the
   current branch's requirements.
2. Install dependencies:

    ```bash
    npm ci
    npm ci --prefix frontend
    ```

3. Complete any environment and fixture setup described in the
   next section.

### Unit and system test command

The proposed combined command for the documented Node test
directories is:

```bash
node --experimental-test-module-mocks --test frontend/src/services/*.test.js backend/src/lib/*.test.js backend/src/services/*.test.js backend/src/routes/*.test.js
```

The `--experimental-test-module-mocks` flag enables tests that
call `t.mock.module`, including
`backend/src/lib/storage.test.js`. The team's previous unflagged
run failed with `TypeError: t.mock.module is not a function`.

### Current `npm test` script

The root `package.json` currently runs the checked-in frontend
service and Explore component tests:

```json
{
    "scripts": {
        "test": "node --test frontend/src/services/*.test.js frontend/tests/exploreEventStatus.test.js"
    }
}
```

Run the script with:

```bash
npm test
```

On November 20, this command passed 17 tests. The backend route
tests described in Part III are not included in the current root
script; the proposed combined command above remains unverified on
this branch.

### UI test command

Install frontend dependencies, then run the dedicated UI suite:

```bash
npm ci --prefix frontend
npm run test:ui
```

No browser download or app startup is required. The tests load the
real JSX through Vite, render into jsdom, and seed a listing into
local storage. The root `npm test` script runs service and component tests;
`npm run test:ui` runs the two complete-story UI tests. CI runs both.

### Continuous integration

The current `.github/workflows/main.yml` uses Node 24, installs root
and frontend dependencies, then runs `npm test` and
`npm run test:ui` as separate steps.

## External Services, Environment, and Test Data

- **Application services:** Supabase PostgreSQL, Better Auth,
  Cloudflare R2, and Resend.
- **Unit tests:** Use isolated fixtures and mock external
  dependencies where appropriate.
- **System tests:** Document which database, authentication,
  email, and storage dependencies are mocked and which are real.
- **Environment variables:** `.dev.vars`, `.env`, and
  `.env.local` contain local secrets and must not be committed.
  Use tracked example files containing non-secret placeholders.
  **Pending:** List the exact variable names required by each
  test command and state when a suite requires no credentials.
- **Test database and storage:** Document whether each suite
  requires a dedicated test database or bucket. Do not let
  automated tests create unwanted records in the shared
  production-labeled Supabase project or write to its R2 bucket.
- **UI fixtures:** Each test seeds `Campus Test Mug` in the
  browser-local `maker_posts` preview store. No account is required.
  Each test starts from a fresh hash route and clears local storage
  after rendering. This preview fixture does not establish backend
  publication behavior.
- **Email delivery:** The existing notes report that Resend
  lacks a verified sending domain, so real delivery to arbitrary
  university addresses is not fully verified. Manual Supabase
  approval after independent email-ownership confirmation is an
  application-testing workaround, not automated test evidence.

## Test Results and Known Limitations

| Check                                                      | Recorded result or remaining work                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Focused runs on November 16, before later teammate changes | 45 general tests and 6 seller-verification route tests passed. These are historical results.                    |
| Updated-branch direct run on November 18                   | 49 tests executed: 48 passed and 1 failed because module mocking was unavailable without the experimental flag. |
| Complete flagged run on the updated branch                 | **Pending:** Record the date, branch/commit, exact command, pass/fail/skip counts, and any failures.            |
| TDD cycle | Complete: Explore event badges; Red 1 passed/3 failed, Green 4 passed, Refactor 17 passed. |
| Required unit tests                                        | **Pending:** Confirm four distinct tests across at least two units in the current branch.                       |
| Required system tests                                      | **Pending:** Confirm two tests and the functions/methods they exercise together.                                |
| Automated UI tests                                         | November 20: `npm run test:ui` — 2 passed, 0 failed, 0 skipped; Home and Explore discovery-to-detail paths. |
| Live external-service integration                          | Not established by mocked tests.                                                                                |

Future coverage could include real-service integration in a
dedicated test environment, verified seller-email delivery, and
additional UI empty/error-state scenarios. These additions do
not replace the assignment's pending required tests.
