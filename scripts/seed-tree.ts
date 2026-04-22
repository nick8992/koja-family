import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { persons } from '../src/db/schema';

type Row = {
  id: number;
  father_id: number | null;
  name_english: string;
  name_arabic: string | null;
  notes: string | null;
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines.shift();
  if (!header) throw new Error('CSV is empty');

  const rows: Row[] = [];
  for (const line of lines) {
    // naive CSV: handle quoted fields that may contain commas
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);

    const [id, fid, nameEn, nameAr, notes] = fields;
    rows.push({
      id: Number(id),
      father_id: fid ? Number(fid) : null,
      name_english: nameEn.trim(),
      name_arabic: nameAr ? nameAr.trim() : null,
      notes: notes ? notes.trim() : null,
    });
  }
  return rows;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const csvPath = join(process.cwd(), 'data', 'koja_tree.csv');
  const csv = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csv);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema: { persons } });

  const existing = await db.execute(sql`SELECT COUNT(*)::int AS n FROM persons`);
  const n = (existing as unknown as { n: number }[])[0]?.n ?? 0;
  if (n > 0) {
    console.log(`persons already has ${n} rows — skipping seed. Clear the table to reseed.`);
    await client.end();
    return;
  }

  // Two-pass insert: first pass inserts every row with father_id NULL
  // (because children can precede parents in any order and we want the
  // explicit IDs to match the CSV). Second pass sets father_id.
  for (const r of rows) {
    await db.execute(sql`
      INSERT INTO persons (id, first_name, notes)
      VALUES (${r.id}, ${r.name_english}, ${r.notes})
    `);
  }
  console.log(`Inserted ${rows.length} rows (no parent links yet)`);

  for (const r of rows) {
    if (r.father_id != null) {
      await db.execute(sql`
        UPDATE persons SET father_id = ${r.father_id} WHERE id = ${r.id}
      `);
    }
  }
  console.log(`Linked father_id for ${rows.filter((r) => r.father_id != null).length} rows`);

  // Bump the sequence so future inserts start above the max CSV id (1006).
  await db.execute(sql`SELECT setval('persons_id_seq', (SELECT MAX(id) FROM persons))`);
  console.log('persons_id_seq bumped past max CSV id');

  await client.end();
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
