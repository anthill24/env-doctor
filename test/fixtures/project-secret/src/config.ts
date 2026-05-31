// Sample source referencing secret-bearing variables.
// The corresponding .env holds canary values that must NEVER leak to output.

export const config = {
  apiKey: process.env.SECRET_API_KEY,
  dbPassword: process.env['DB_PASSWORD'],
  sessionSecret: process.env.SESSION_SECRET,
  privateKey: process.env.PRIVATE_KEY,
};
