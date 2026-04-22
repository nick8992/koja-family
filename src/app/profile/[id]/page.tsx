import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import {
  getPerson,
  getAncestors,
  getChildren,
  displayFullName,
  type PersonRecord,
} from '@/lib/person-data';
import {
  canAddChildUnder,
  canEditPerson,
  type SessionUser,
} from '@/lib/permissions';
import { relationship } from '@/lib/relationships';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/dictionary';
import { AddChildButton } from '@/components/AddChildButton';
import { ClaimButton } from '@/components/ClaimButton';
import { EditableField } from '@/components/EditableField';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

function fmtField(v: string | null | undefined, lang: 'en' | 'ar'): string {
  if (v == null || v === '') return translate(lang, 'profile.not_set');
  return v;
}

function fmtBirthDeath(p: PersonRecord, lang: 'en' | 'ar'): string {
  if (!p.birthDate && !p.deathDate) return translate(lang, 'profile.not_set');
  const b = p.birthDate ?? '?';
  if (p.isDeceased || p.deathDate) return `${b} \u2013 ${p.deathDate ?? '?'}`;
  return b;
}

export default async function ProfilePage({ params }: Props) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) notFound();

  const session = await auth();
  const sessionUser = session?.user as SessionUser | undefined;
  const viewerUserId = sessionUser?.id ? Number(sessionUser.id) : null;
  const viewerPersonId = sessionUser?.personId ?? null;

  // Overlay unapproved viewer's own pending edits onto the record they see.
  const person = await getPerson(
    id,
    sessionUser && !sessionUser.approved ? viewerUserId : null
  );
  if (!person) notFound();

  const lang = await getLanguage();
  const ancestorsSelfFirst = await getAncestors(id, false);
  const ancestorsRootFirst = [...ancestorsSelfFirst].reverse();
  const children = await getChildren(id);

  // Edit permissions
  const canEditHere = viewerUserId
    ? await canEditPerson(viewerUserId, id)
    : false;

  const canAddChildHere =
    sessionUser && person.gender === 'M'
      ? await canAddChildUnder(sessionUser, person.id)
      : false;

  const canAddRootSibling =
    sessionUser?.role === 'admin' && person.id === 1;

  // Relationship label ("your father", etc.)
  let relLabel: string | null = null;
  if (viewerPersonId && viewerPersonId !== id) {
    const viewerChain = await getAncestors(viewerPersonId, false);
    const byId = new Map<number, { id: number; fid: number | null }>();
    for (const p of [...viewerChain, ...ancestorsSelfFirst]) {
      byId.set(p.id, { id: p.id, fid: p.fatherId });
    }
    const rel = relationship(byId, viewerPersonId, id, lang);
    if (rel.mrca != null) {
      const yourWord = translate(lang, 'profile.your');
      relLabel = yourWord ? `${yourWord} ${rel.directional}` : rel.directional;
    } else {
      relLabel = translate(lang, 'profile.not_related');
    }
  }

  const generationDepth = ancestorsSelfFirst.length - 1;
  const fullName = displayFullName(ancestorsRootFirst);
  const initial = person.firstName.charAt(0).toUpperCase();

  const isMe = viewerPersonId === id;

  return (
    <div className="mx-auto max-w-[900px] px-8 py-10">
      <Link
        href="/tree"
        className="font-display mb-6 inline-block rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
      >
        {await tServer('profile.back')}
      </Link>

      {/* HEADER */}
      <section className="relative mb-6 grid grid-cols-1 items-center gap-8 border border-border bg-cream p-8 md:grid-cols-[auto_1fr_auto]">
        <div
          className="absolute inset-2 pointer-events-none border border-border"
          aria-hidden
        />
        <div className="relative mx-auto h-36 w-36 md:mx-0">
          <div
            className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-[3px] border-gold font-display text-5xl font-medium text-cream shadow-lg"
            style={{
              background: person.profilePhotoUrl
                ? `url(${person.profilePhotoUrl}) center/cover`
                : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
            }}
          >
            {person.profilePhotoUrl ? null : initial}
          </div>
          {canEditHere ? (
            <ProfilePhotoUpload
              personId={person.id}
              hasPhoto={!!person.profilePhotoUrl}
            />
          ) : null}
        </div>

        <div className="relative">
          <div className="font-display flex items-center gap-3 text-4xl font-medium text-ink">
            {person.firstName}
            {person.isDeceased ? (
              <span className="text-xl italic text-ink-muted">&dagger;</span>
            ) : null}
          </div>
          <div className="font-display mt-1 text-sm italic text-ink-muted">{fullName}</div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted">
            {isMe ? (
              <MetaBullet>{await tServer('profile.your.profile')}</MetaBullet>
            ) : relLabel ? (
              <MetaBullet>{relLabel}</MetaBullet>
            ) : null}
            <MetaBullet>
              {await tServer('profile.generation')} {generationDepth}
            </MetaBullet>
            <MetaBullet>ID #{person.id}</MetaBullet>
            {person.notes ? (
              <MetaBullet accent>
                {await tServer('profile.note')}: {person.notes}
              </MetaBullet>
            ) : null}
          </div>
        </div>

        <div className="relative flex flex-col gap-2">
          {person.claimStatus === 'approved' ? (
            <button
              type="button"
              disabled
              className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm opacity-60"
            >
              {await tServer('profile.action.claimed')}
            </button>
          ) : person.claimStatus === 'pending' ? (
            <button
              type="button"
              disabled
              className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm opacity-60"
            >
              {await tServer('profile.action.claimed')}
            </button>
          ) : sessionUser ? (
            <button
              type="button"
              disabled
              title="Sign out to claim a different spot"
              className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm opacity-60"
            >
              {await tServer('profile.action.claim')}
            </button>
          ) : (
            <ClaimButton personId={person.id} fullName={fullName} />
          )}
          {canAddChildHere ? (
            <AddChildButton
              fatherId={person.id}
              label={await tServer('addperson.cta.child')}
              parentLabel={person.firstName}
              variant="primary"
            />
          ) : null}
          {canAddRootSibling ? (
            <AddChildButton
              fatherId={null}
              label={await tServer('addperson.cta.root_sibling')}
              parentLabel={await tServer('addperson.sub.root')}
            />
          ) : null}
        </div>
      </section>

      {/* LINEAGE STRIP */}
      <section className="mb-6 border border-border bg-cream p-6">
        <h3 className="font-display mb-3.5 border-b border-border pb-2 text-xl font-medium text-ink">
          {await tServer('profile.lineage')}
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {ancestorsRootFirst.map((p, i) => (
            <span key={p.id} className="flex items-center gap-2">
              <Link
                href={`/profile/${p.id}`}
                className={
                  'font-display shrink-0 whitespace-nowrap border px-3.5 py-2.5 text-sm transition-colors ' +
                  (p.id === id
                    ? 'border-olive-deep bg-olive-deep text-cream'
                    : 'border-border bg-parchment text-ink hover:border-terracotta hover:bg-cream')
                }
              >
                {p.firstName.replace(/ Koja$/, '')}
              </Link>
              {i < ancestorsRootFirst.length - 1 ? (
                <span className="text-sm text-border-dark">
                  {lang === 'ar' ? '\u2190' : '\u2192'}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </section>

      {/* DETAILS + BIO */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.4fr]">
        <section className="border border-border bg-cream p-6">
          <h3 className="font-display mb-3.5 border-b border-border pb-2 text-xl font-medium text-ink">
            {await tServer('profile.details')}
          </h3>
          <EditableField
            personId={id}
            field="first_name"
            label={await tServer('profile.field.name')}
            value={person.firstName}
            rawValue={person.firstName}
            editable={canEditHere}
          />
          <EditableField
            personId={id}
            field="current_location"
            label={await tServer('profile.field.location')}
            value={fmtField(person.currentLocation, lang)}
            rawValue={person.currentLocation ?? ''}
            editable={canEditHere}
          />
          <EditableField
            personId={id}
            field="birth_date"
            label={await tServer('profile.field.born')}
            type="date"
            value={fmtBirthDeath(person, lang)}
            rawValue={person.birthDate ?? ''}
            editable={canEditHere}
          />
          <EditableField
            personId={id}
            field="occupation"
            label={await tServer('profile.field.occupation')}
            value={fmtField(person.occupation, lang)}
            rawValue={person.occupation ?? ''}
            editable={canEditHere}
          />
          <EditableField
            personId={id}
            field="phone"
            label={await tServer('profile.field.phone')}
            value={fmtField(person.phonePublic ? person.phone : null, lang)}
            rawValue={person.phone ?? ''}
            editable={canEditHere}
          />
          <EditableField
            personId={id}
            field="email"
            label={await tServer('profile.field.email')}
            value={fmtField(person.email, lang)}
            rawValue={person.email ?? ''}
            editable={canEditHere}
          />
          {canEditHere ? (
            <EditableField
              personId={id}
              field="is_deceased"
              label={await tServer('edit.deceased.title')}
              type="bool"
              value={
                person.isDeceased
                  ? await tServer('tree.legend.deceased')
                  : await tServer('profile.not_set')
              }
              rawValue={person.isDeceased ? 'true' : 'false'}
              editable
            />
          ) : null}
          <ChildrenField
            label={await tServer('profile.field.children')}
            childs={children}
            empty={await tServer('profile.no_children')}
          />
        </section>
        <section className="border border-border bg-cream p-6">
          <h3 className="font-display mb-3.5 border-b border-border pb-2 text-xl font-medium text-ink">
            {await tServer('profile.biography')}
          </h3>
          {canEditHere ? (
            <EditableField
              personId={id}
              field="bio"
              label={await tServer('profile.biography')}
              type="textarea"
              value={person.bio || (await tServer('profile.no_bio'))}
              rawValue={person.bio ?? ''}
              editable
            />
          ) : (
            <p className="font-display whitespace-pre-wrap py-3 text-[15px] italic leading-relaxed text-ink-soft">
              {person.bio || (await tServer('profile.no_bio'))}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function MetaBullet({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={accent ? 'text-terracotta-deep' : undefined}>
      <span className="me-1 text-gold">◆</span>
      {children}
    </span>
  );
}

function ChildrenField({
  label,
  childs,
  empty,
}: {
  label: string;
  childs: PersonRecord[];
  empty: string;
}) {
  return (
    <div className="flex justify-between border-b border-dotted border-border py-2 text-sm last:border-b-0">
      <span className="font-display italic text-ink-muted">{label}</span>
      <span className="max-w-[60%] text-end">
        {childs.length === 0 ? (
          <em className="text-ink-muted">{empty}</em>
        ) : (
          <span className="flex flex-wrap justify-end gap-x-2">
            {childs.map((c, i) => (
              <span key={c.id}>
                <Link
                  href={`/profile/${c.id}`}
                  className="cursor-pointer text-terracotta-deep hover:underline"
                >
                  {c.firstName.replace(/ Koja$/, '')}
                </Link>
                {i < childs.length - 1 ? ',' : ''}
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  );
}
