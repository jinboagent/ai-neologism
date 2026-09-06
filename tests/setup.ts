// Point every test file at a throwaway in-memory database so the dev data at
// data/ai-neologism.db is never touched. Must run before src/lib/db.ts opens a handle.
process.env.NEOLOGISM_DB_PATH = ":memory:";

// Deterministic review threshold — src/lib/keys.ts reads this at module load.
process.env.REVIEW_THRESHOLD = "3";
