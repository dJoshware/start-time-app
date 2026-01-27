import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable');
}

// Disable prepared statements to avoid issues with some serverless setups.
export const sql = postgres(connectionString, { prepare: false });
