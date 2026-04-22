'use server';

import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { sendAdditionRequest } from './email';

export type RequestState =
  | { status: 'idle' }
  | { status: 'ok' }
  | {
      status: 'error';
      code: 'bad_name' | 'bad_email' | 'bad_father' | 'father_not_found' | 'generic';
    };

function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function fullNameFor(personId: number): Promise<string> {
  const rows = await db.execute<{ full: string | null }>(sql`
    WITH RECURSIVE chain AS (
      SELECT id, father_id, first_name, 0 AS depth FROM persons WHERE id = ${personId}
      UNION ALL
      SELECT p.id, p.father_id, p.first_name, c.depth + 1
        FROM chain c JOIN persons p ON p.id = c.father_id
    )
    SELECT string_agg(REPLACE(first_name, ' Koja', ''), ' ' ORDER BY depth ASC) AS full FROM chain
  `);
  const raw = (rows as unknown as { full: string | null }[])[0]?.full ?? null;
  return raw ? raw + ' Koja' : '';
}

export async function requestAdditionAction(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  const firstName = String(formData.get('firstName') ?? '').trim();
  if (firstName.length < 1 || firstName.length > 100) {
    return { status: 'error', code: 'bad_name' };
  }

  const genderRaw = String(formData.get('gender') ?? '');
  const gender = genderRaw === 'F' ? 'F' : genderRaw === 'M' ? 'M' : null;

  const emailRaw = String(formData.get('email') ?? '');
  const email = normalizeEmail(emailRaw);
  if (!email) return { status: 'error', code: 'bad_email' };

  const fatherIdRaw = formData.get('fatherId');
  const fatherId = Number(fatherIdRaw);
  if (!Number.isInteger(fatherId) || fatherId < 1) {
    return { status: 'error', code: 'bad_father' };
  }

  const fatherRows = await db.execute<{ first_name: string }>(sql`
    SELECT first_name FROM persons WHERE id = ${fatherId} LIMIT 1
  `);
  const father = (fatherRows as unknown as { first_name: string }[])[0];
  if (!father) return { status: 'error', code: 'father_not_found' };

  const noteRaw = String(formData.get('note') ?? '').trim();
  const note = noteRaw.length > 0 ? noteRaw.slice(0, 800) : null;

  try {
    const origin = await getOrigin();
    const fatherFull = await fullNameFor(fatherId);
    await sendAdditionRequest({
      firstName,
      gender,
      fatherName: father.first_name,
      fatherId,
      fatherFullName: fatherFull,
      requesterEmail: email,
      requesterNote: note,
      siteOrigin: origin,
    });
  } catch (err) {
    console.error('[request-addition] email failed:', err);
    return { status: 'error', code: 'generic' };
  }

  return { status: 'ok' };
}
