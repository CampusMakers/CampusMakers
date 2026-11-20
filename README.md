# Campus Makers _ CSC3100

### Roles
* **Scrum Master:** Sai Deekshitha
* **Product Manager:** Celeste
* **Lead Engineer:** Jarek
* **Tester:** Hunter


### TE6 : SEQUENCE DIAGRAM
https://github.com/CampusMakers/CampusMakers/blob/main/SRD/TE6-SequenceDiagrams.pdf


## Testing — TE 7

From the repository root, install dependencies with `npm ci` and `npm ci --prefix frontend`. Run `npm test` for the current service and component tests, or `npm run test:tdd` for Explore's event-status component tests. Verified locally using Node.js v26.9.0; these tests require no credentials or external services.

### TDD: distinguish Explore event states

Requirement: show Upcoming, In Progress, and Completed on Explore event cards. Tests rendering the actual card were written first: three failed because the labels were missing, while the ordinary-post case passed. The smallest fix displayed the existing event-status helper's result (all four passed). Refactoring extracted a shared badge for cards and event details, added distinct colors and automatic refresh; all 17 tests and the frontend build passed.

See [the full TDD workflow and failing-test example](SRD/TESTING.md#part-i-test-driven-development-tdd), with linked Red, Green, and Refactor output. These component checks do not replace complete user-story UI tests.
