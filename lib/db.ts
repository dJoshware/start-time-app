import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
    throw new Error('Missing POSTGRES_URL environment variable');
}

export const sql = postgres(connectionString, { prepare: false });
