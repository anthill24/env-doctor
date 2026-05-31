// Destructured access to process.env / import.meta.env.

const { DB_HOST, DB_PORT: port, DB_NAME = 'app', ...rest } = process.env;
const { VITE_PUBLIC_URL } = import.meta.env;

// A plain reference too, to confirm both detection paths combine.
const region = process.env.AWS_REGION;

export { DB_HOST, port, DB_NAME, rest, VITE_PUBLIC_URL, region };
