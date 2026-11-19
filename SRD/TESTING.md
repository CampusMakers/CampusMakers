# Campus Makers - Automated Testing (CSC 3100 TE 7)


## 1. Tools and test levels

| Level | Tool | Scope | Current evidence |
| --- | --- | --- | --- |
| TDD (Red-Green-Refactor) | Node.js test runner or team-selected tool | One meaningful new rule or bug fix | **Pending:** add failing test evidence, code change, and refactor |
| Unit | Node.js built-in `node:test` and `node:assert` | Small functions/services isolated from other components | Existing `*.test.js` files in frontend and backend |
| System / API integration-style | Node.js test runner, Supertest, dependency mocks | HTTP routes with authentication, validation, token or service logic | `backend/src/routes/storesVerification.test.js` (and newer route tests to verify) |
| UI | **To be confirmed by UI-test owners** (Playwright or React Testing Library) | Complete user stories as experienced through the interface | **Pending:** at least two automated tests |

System/API tests may mock the database and email provider. They exercise multiple application functions but do not prove that a real production database or external email provider works. Manual browser testing is useful evidence, but it does not replace the required **automated UI tests**.

## 2. Prerequisites and commands

Run all commands from the **repository root** (`CampusMakers/`)

1. Install **Node.js 24** and npm (Node 24 is used in the GitHub Actions workflow shown on `main`).
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Run the complete automated Node unit and API-route tests:

   ```bash
   node --experimental-test-module-mocks --test frontend/src/services/*.test.js backend/src/lib/*.test.js backend/src/services/*.test.js backend/src/routes/*.test.js
   ```

4. Run the standard npm entry point **after the root `package.json` `test` script is configured**:

   ```bash
   npm test
   ```

5. UI-test owners: add and document the UI test command here once their framework and browser dependencies are configured.

### Root `package.json` test script to verify/add

The repository should expose this command through the root package's `scripts` object. **Merge into the existing scripts; do not replace other scripts.**

```json
"test": "node --experimental-test-module-mocks --test frontend/src/services/*.test.js backend/src/lib/*.test.js backend/src/services/*.test.js backend/src/routes/*.test.js"
```

The `--experimental-test-module-mocks` flag is required for tests calling `t.mock.module`, such as `backend/src/lib/storage.test.js`. Without this flag the storage test was observed to fail with `TypeError: t.mock.module is not a function` even though other tests passed.

**Verification checklist:** On the updated `development` branch, run `npm test`. If some route tests need additional setup, resolve that with the test owners and update the command rather than silently excluding important tests. Once automated UI tests are added, decide with the team whether `npm test` should invoke those as well, or document a separate `npm run test:ui` command and run it in CI.

### GitHub Actions

The workflow visible in `.github/workflows/main.yml` on `main` uses Node 24, `npm ci`, then:

```bash
npm run test --if-present
```

The `--if-present` option **does not fail when no root `test` script exists**. Once the script is configured and confirmed working, prefer the following step in the workflow so CI cannot skip it silently:

```yaml
- name: Run automated tests
  run: npm test
```

Confirm the workflow and package script in the team's current branch before editing them. Browser-based UI tests may also require a browser installation step.

## 3. Unit tests - Part II (minimum 4 tests across at least 2 units)

Existing examples from the test run:

**Unit A: `frontend/src/services/sellerRegistration.test.js`**

- Accepts campus email ignoring letter case and whitespace.
- Rejects an email that could be confused with another university's domain.
- Additional cases cover missing school domains and invalid addresses.

**Unit B: `frontend/src/services/cartModel.test.js`**

- Adding the same product increments quantity only up to max-per-order.
- Enforces available-stock limits and rejects invalid products.
- Additional cases check mixed-seller carts, quantity changes, and guest separation.

Additional unit-test files include `sellerVerificationTokens.test.js`, `profilePhotos.test.js`, `profilePhotoBlob.test.js`, `sellerListingValidation.test.js`, and email-service tests with mocked provider calls. See the actual test files for assertions and setup.



## 4. System tests - Part III (minimum 2)

**Candidate suite: `backend/src/routes/storesVerification.test.js`**

These tests exercise API request handling together with seller-verification rules and mocked supporting services/data access. Existing tested scenarios include:

1. **Authorization:** Another signed-in user cannot confirm someone else's university email verification. Expected outcome: request is rejected without approving that store.
2. **Single-use verification:** A valid request confirms the seller, while reuse of the same token is rejected. Expected outcome: verification succeeds once and cannot be replayed.

Other scenarios include expired tokens, storing token **hashes** instead of raw tokens, and cleanup when email delivery fails. Newer route suites in the updated branch include `adminMembers.test.js` and `uploadPhotos.test.js`; their current behavior and results must be confirmed by running the full command.


## 5. TDD - Part I (team to complete)

**Owner:** _[Teammate name]_  
**Feature / bug / rule:** _[Describe one small meaningful change]_  
**User-visible requirement:** _[What must happen and why?]_  
**Test file:** _[path]_  
**Production file:** _[path]_  
**Related commit or PR:** _[link or commit ID]_

| Cycle | Required evidence (fill with the actual outcome) |
| --- | --- |
| **RED** | Write a new automated test first. Record the test name, command, and the **expected failure**. Add the actual failure message or a short screenshot. |
| **GREEN** | Describe the smallest production-code change. Re-run the same test; record the passing result. |
| **REFACTOR** | Describe the cleanup (or explicitly say none was needed), then show the test still passes. |

**Do not manufacture a failed run or retroactively label a previously implemented feature as TDD.** Pick a new validation rule or genuine bug fix and record the cycle as it happens.

## 6. UI tests - Part IV (team to complete)

**Owner:** _[Teammate name(s)]_  
**Framework:** _[Playwright / React Testing Library / other]_  
**Test file(s):** _[paths]_  
**Run command:** _[working command]_  
**Seed/mock setup:** _[describe]_ 

Minimum: **two automated UI tests** covering at least **one complete user story** and asserting visible behavior.

Suggested single story: *As a buyer, I want to discover and open a published Campus Makers listing so I can inspect a product.*

1. **Home discovery:** Open Home; verify a known published product card is visible; open it and verify its Product Detail title is displayed.
2. **Explore discovery:** Open Explore; verify the same seeded product is available and can be opened; assert visible product details or a clear empty/error state as applicable.


## 7. External services, environment, and test data

- The application uses **Supabase PostgreSQL**, **Better Auth**, **Cloudflare R2**, and **Resend**. Do not put credentials in tests or documentation.
- Unit tests should use isolated fixtures. API-route tests that mock the database/email/storage must state that limitation. Running the complete automated suite must not create unwanted records in the shared production-labeled Supabase project or write to its R2 bucket.
- `.dev.vars`, `.env`, and `.env.local` are local secrets and must not be committed. Use tracked examples only as templates with non-secret placeholders.
- Real seller email delivery is **not** fully verified for arbitrary university addresses because Resend lacks a verified sending domain. Existing manual Supabase approval is an application-testing workaround **after independent email ownership confirmation**, not a substitute for automated verification tests.
- UI tests may need seeded published listings, accounts, and a locally running server. Record the seed/setup and cleanup instructions before the final submission. Do not use the team's shared production-labeled database as a disposable testing environment.

## 8. Results, reliability, and limitations

| Check | Observed result / action |
| --- | --- |
| Previous focused tests (November 16, before subsequent teammate changes) | 45 general tests passed and 6 seller-verification route tests passed. Historical result only. |
| Updated branch direct test run (November 18) | 49 executed: **48 passed, 1 failed** because `t.mock.module` was unavailable without the experimental module-mocking flag. |
| Full flagged test run | **Pending:** rerun the command from Section 2 on the updated branch, including route tests; record counts and failures here. |
| TDD evidence | Pending teammate work. |
| Automated UI tests | Pending teammate work. |
| Live service integration | Not established by mocked tests. |

