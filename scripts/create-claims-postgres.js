const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  const { default: postgres } = await import('postgres');
  const sql = postgres(DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS claims (
      id SERIAL PRIMARY KEY,
      entry_id TEXT NOT NULL,
      email TEXT NOT NULL,
      unicode_variant TEXT,
      amount_paid INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_session_id TEXT,
      stripe_payment_intent TEXT,
      github_repo TEXT,
      deploy_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_claims_email ON claims(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status)`;
  console.log('claims table created in Postgres');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
