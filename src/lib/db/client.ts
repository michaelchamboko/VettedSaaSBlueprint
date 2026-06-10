export function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required.");
  }
}
