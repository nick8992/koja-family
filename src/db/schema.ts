import {
  pgTable,
  serial,
  bigserial,
  integer,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  char,
  date,
  check,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const persons = pgTable(
  'persons',
  {
    id: serial('id').primaryKey(),
    fatherId: integer('father_id').references((): AnyPgColumn => persons.id, {
      onDelete: 'set null',
    }),
    siblingOrder: integer('sibling_order'),
    motherId: integer('mother_id').references((): AnyPgColumn => persons.id, {
      onDelete: 'set null',
    }),
    spouseId: integer('spouse_id').references((): AnyPgColumn => persons.id, {
      onDelete: 'set null',
    }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).default('Koja'),
    nameArabic: varchar('name_arabic', { length: 200 }),
    gender: char('gender', { length: 1 }).default('M'),
    birthYear: integer('birth_year'),
    birthDate: date('birth_date'),
    deathYear: integer('death_year'),
    deathDate: date('death_date'),
    isDeceased: boolean('is_deceased').default(false),
    birthplace: varchar('birthplace', { length: 200 }),
    currentLocation: varchar('current_location', { length: 200 }),
    occupation: varchar('occupation', { length: 200 }),
    bio: text('bio'),
    profilePhotoUrl: text('profile_photo_url'),
    phone: varchar('phone', { length: 30 }),
    phonePublic: boolean('phone_public').default(false),
    email: varchar('email', { length: 255 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedByUser: integer('deleted_by_user').references((): AnyPgColumn => users.id),
    deletionBatchId: text('deletion_batch_id'),
  },
  (t) => [
    index('idx_persons_father').on(t.fatherId),
    index('idx_persons_name').on(t.firstName, t.lastName),
    index('idx_persons_deletion_batch').on(t.deletionBatchId),
    check('persons_gender_check', sql`${t.gender} IN ('M', 'F')`),
  ]
);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    personId: integer('person_id')
      .notNull()
      .unique()
      .references(() => persons.id),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 30 }),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 20 }).default('member'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    isActive: boolean('is_active').default(true),
  },
  (t) => [
    index('idx_users_email').on(t.email),
    check('users_role_check', sql`${t.role} IN ('member', 'admin')`),
  ]
);

export const adminNotifications = pgTable('admin_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 30 }).notNull(),
  message: text('message'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pendingEdits = pgTable(
  'pending_edits',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => persons.id),
    fieldName: varchar('field_name', { length: 50 }).notNull(),
    newValue: text('new_value'),
    status: varchar('status', { length: 20 }).default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: integer('resolved_by').references(() => users.id),
  },
  (t) => [
    index('idx_pending_user').on(t.userId, t.status),
    check(
      'pending_edits_status_check',
      sql`${t.status} IN ('pending', 'applied', 'rejected', 'discarded')`
    ),
  ]
);

export const editHistory = pgTable(
  'edit_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    personId: integer('person_id')
      .notNull()
      .references(() => persons.id),
    editedByUser: integer('edited_by_user').references(() => users.id),
    fieldName: varchar('field_name', { length: 50 }).notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    editedAt: timestamp('edited_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_edit_history_person').on(t.personId, t.editedAt)]
);

export const posts = pgTable(
  'posts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    authorUserId: integer('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    kind: varchar('kind', { length: 20 }).default('general'),
    photoUrls: text('photo_urls').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    visible: boolean('visible').default(true),
  },
  (t) => [
    index('idx_posts_feed').on(t.createdAt),
    check(
      'posts_kind_check',
      sql`${t.kind} IN ('general', 'business', 'story', 'announcement')`
    ),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 30 }).notNull(),
    message: text('message').notNull(),
    link: text('link'),
    actorPersonId: integer('actor_person_id').references(() => persons.id, {
      onDelete: 'set null',
    }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_notifications_inbox').on(t.userId, t.readAt, t.createdAt),
  ]
);

export const postLikes = pgTable(
  'post_likes',
  {
    id: serial('id').primaryKey(),
    postId: bigint('post_id', { mode: 'number' })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('post_likes_unique').on(t.postId, t.userId),
    index('idx_post_likes_post').on(t.postId),
  ]
);

export const comments = pgTable(
  'comments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    postId: bigint('post_id', { mode: 'number' })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorUserId: integer('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    photoUrls: text('photo_urls').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('idx_comments_post').on(t.postId, t.createdAt)]
);

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    creatorUserId: integer('creator_user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    location: varchar('location', { length: 300 }),
    photoUrl: text('photo_url'),
    announcementPostId: bigint('announcement_post_id', { mode: 'number' })
      .references(() => posts.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('idx_events_time').on(t.startsAt)]
);

export const personPhotos = pgTable('person_photos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  personId: integer('person_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  uploadedByUser: integer('uploaded_by_user').references(() => users.id),
  url: text('url').notNull(),
  caption: text('caption'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const albumPhotos = pgTable(
  'album_photos',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uploadedByUser: integer('uploaded_by_user')
      .notNull()
      .references(() => users.id),
    url: text('url').notNull(),
    caption: text('caption'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('idx_album_created').on(t.createdAt)]
);

export const passwordResets = pgTable('password_resets', {
  token: varchar('token', { length: 64 }).primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Event = typeof events.$inferSelect;
