import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const ADMIN_PERSON_ID = 270;

function generatePassword(): string {
  // 18 random bytes → 24 base64 chars → replace URL-unsafe chars with readable ones
  const raw = randomBytes(18).toString('base64');
  return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error('ADMIN_EMAIL is not set');

  const providedPassword = process.env.ADMIN_PASSWORD;
  const password = providedPassword || generatePassword();
  const hash = await bcrypt.hash(password, 10);

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  // Verify the person exists
  const person = await db.execute(
    sql`SELECT id, first_name FROM persons WHERE id = ${ADMIN_PERSON_ID}`
  );
  if ((person as unknown as unknown[]).length === 0) {
    throw new Error(`person ${ADMIN_PERSON_ID} not found — run db:seed first`);
  }

  const existing = await db.execute(
    sql`SELECT id, email, role FROM users WHERE person_id = ${ADMIN_PERSON_ID}`
  );
  if ((existing as unknown as unknown[]).length > 0) {
    // Rotate password instead of erroring
    await db.execute(sql`
      UPDATE users
         SET password_hash = ${hash},
             email = ${email},
             role = 'admin',
             approved_at = COALESCE(approved_at, NOW()),
             is_active = TRUE
       WHERE person_id = ${ADMIN_PERSON_ID}
    `);
    console.log(`Admin user already existed — password rotated for person_id=${ADMIN_PERSON_ID}.`);
  } else {
    await db.execute(sql`
      INSERT INTO users (person_id, email, password_hash, role, approved_at)
      VALUES (${ADMIN_PERSON_ID}, ${email}, ${hash}, 'admin', NOW())
    `);
    console.log(`Admin user created for person_id=${ADMIN_PERSON_ID}.`);
  }

  await client.end();

  console.log('');
  console.log('========================================');
  console.log('  Admin login');
  console.log('========================================');
  console.log(`  Email:    ${email}`);
  if (!providedPassword) {
    console.log(`  Password: ${password}`);
    console.log('');
    console.log('  ^ Save this now. It will not be shown again.');
    console.log('  Rotate by re-running db:create-admin, optionally with');
    console.log('  ADMIN_PASSWORD=... in env to set a specific value.');
  } else {
    console.log('  Password: (from ADMIN_PASSWORD env var — not echoed)');
  }
  console.log('========================================');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
