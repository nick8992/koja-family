import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type PersonRecord = {
  id: number;
  fatherId: number | null;
  firstName: string;
  lastName: string | null;
  nameArabic: string | null;
  birthDate: string | null;
  deathDate: string | null;
  isDeceased: boolean;
  birthplace: string | null;
  currentLocation: string | null;
  occupation: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  phone: string | null;
  phonePublic: boolean;
  email: string | null;
  notes: string | null;
  claimStatus: 'unclaimed' | 'pending' | 'approved' | 'rejected';
};

type Row = {
  id: number;
  father_id: number | null;
  first_name: string;
  last_name: string | null;
  name_arabic: string | null;
  birth_date: string | null;
  death_date: string | null;
  is_deceased: boolean | null;
  birthplace: string | null;
  current_location: string | null;
  occupation: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  phone: string | null;
  phone_public: boolean | null;
  email: string | null;
  notes: string | null;
  claim_status: 'unclaimed' | 'pending' | 'approved' | 'rejected';
};

function rowToRecord(r: Row): PersonRecord {
  return {
    id: r.id,
    fatherId: r.father_id,
    firstName: r.first_name,
    lastName: r.last_name,
    nameArabic: r.name_arabic,
    birthDate: r.birth_date,
    deathDate: r.death_date,
    isDeceased: !!r.is_deceased,
    birthplace: r.birthplace,
    currentLocation: r.current_location,
    occupation: r.occupation,
    bio: r.bio,
    profilePhotoUrl: r.profile_photo_url,
    phone: r.phone,
    phonePublic: !!r.phone_public,
    email: r.email,
    notes: r.notes,
    claimStatus: r.claim_status,
  };
}

export async function getPerson(id: number): Promise<PersonRecord | null> {
  const rows = await db.execute<Row>(sql`
    SELECT * FROM person_with_claim WHERE id = ${id} LIMIT 1
  `);
  const arr = rows as unknown as Row[];
  return arr.length ? rowToRecord(arr[0]) : null;
}

/** Patrilineal chain from self → root, already ordered root-first if `rootFirst` is true. */
export async function getAncestors(id: number, rootFirst = false): Promise<PersonRecord[]> {
  const rows = await db.execute<Row & { depth: number }>(sql`
    WITH RECURSIVE chain AS (
      SELECT p.*, 0 AS depth FROM person_with_claim p WHERE p.id = ${id}
      UNION ALL
      SELECT parent.*, c.depth + 1
        FROM chain c
        JOIN person_with_claim parent ON parent.id = c.father_id
    )
    SELECT * FROM chain ORDER BY depth ${rootFirst ? sql`DESC` : sql`ASC`}
  `);
  return (rows as unknown as Row[]).map(rowToRecord);
}

export async function getChildren(fatherId: number): Promise<PersonRecord[]> {
  const rows = await db.execute<Row>(sql`
    SELECT * FROM person_with_claim WHERE father_id = ${fatherId} ORDER BY id
  `);
  return (rows as unknown as Row[]).map(rowToRecord);
}

export function displayFullName(chainRootFirst: PersonRecord[]): string {
  // chain is root → self, e.g. [Hanna Koja, Sepa, Gorial, ..., me].
  // Output is patrilineal self-first: "Me Father Grandfather ... Hanna Koja".
  const rootIsHanna = chainRootFirst.length > 0 && chainRootFirst[0].id === 1;
  const names = [...chainRootFirst].reverse().map((p) => p.firstName.replace(/ Koja$/, ''));
  return names.join(' ') + (rootIsHanna ? '' : ' Koja');
}
