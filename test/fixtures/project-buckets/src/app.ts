// Sample source that references env vars in several styles.
// Used by env-doctor tests to exercise each reporting bucket.

const apiKey = process.env.API_KEY;
const databaseUrl = process.env.DATABASE_URL;
const port = process.env.PORT ?? '3000';

// Bracket access
const bracket = process.env['BRACKET_VAR'];

// Vite-style client env
const flag = import.meta.env.IMPORT_META_FLAG;

export { apiKey, databaseUrl, port, bracket, flag };
