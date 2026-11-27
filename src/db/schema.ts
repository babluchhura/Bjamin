import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminCredentials = pgTable('admin_credentials', {
  id: serial('id').primaryKey(),
  slotKey: text('slot_key').notNull().unique(),
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const plots = pgTable('plots', {
  id: serial('id').primaryKey(),
  plotCode: text('plot_code').notNull().unique(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  totalArea: text('total_area').notNull(),
  areaDecimals: doublePrecision('area_decimals').notNull(),
  dimensions: text('dimensions').notNull(),
  price: integer('price').notNull(),
  pricePerDecimal: integer('price_per_decimal').notNull(),
  roadAccess: text('road_access').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('Available'),
  featured: boolean('featured').notNull().default(false),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  googleMapsUrl: text('google_maps_url').notNull(),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  plotId: integer('plot_id').references(() => plots.id, { onDelete: 'set null' }),
  plotName: text('plot_name'),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('New'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteVisits = pgTable('site_visits', {
  id: serial('id').primaryKey(),
  plotId: integer('plot_id').references(() => plots.id, { onDelete: 'set null' }),
  plotName: text('plot_name'),
  visitorName: text('visitor_name').notNull(),
  visitorEmail: text('visitor_email').notNull(),
  visitorPhone: text('visitor_phone').notNull(),
  preferredDate: text('preferred_date').notNull(),
  preferredTime: text('preferred_time').notNull(),
  guestsCount: integer('guests_count').notNull().default(1),
  notes: text('notes'),
  status: text('status').notNull().default('Pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  customerRole: text('customer_role').notNull(),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  plotPurchased: text('plot_purchased'),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mediaUploads = pgTable('media_uploads', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserRecord = typeof users.$inferSelect;
export type PlotRecord = typeof plots.$inferSelect;
export type InquiryRecord = typeof inquiries.$inferSelect;
export type SiteVisitRecord = typeof siteVisits.$inferSelect;
export type ReviewRecord = typeof reviews.$inferSelect;
export type SiteSettingRecord = typeof siteSettings.$inferSelect;
