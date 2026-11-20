// Loaded before every test file (see the "test" script in package.json).
// Provides the environment variables config.js requires so modules can import.
process.env.NODE_ENV ??= "test";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.DATABASE_URL ??= "postgres://localhost/test";
process.env.GEOCODER_MIN_INTERVAL_MS ??= "0";
