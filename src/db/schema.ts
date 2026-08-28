import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["customer", "admin", "rider"]);

export const deliveryTypeEnum = pgEnum("delivery_type", [
  "standard",
  "express",
  "same_day",
]);

export const parcelStatusEnum = pgEnum("parcel_status", [
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parcels = pgTable("parcels", {
  id: uuid("id").defaultRandom().primaryKey(),
  trackingNumber: varchar("tracking_number", { length: 24 }).notNull().unique(),

  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  senderName: varchar("sender_name", { length: 120 }).notNull(),
  senderPhone: varchar("sender_phone", { length: 20 }).notNull(),
  senderAddress: text("sender_address").notNull(),

  receiverName: varchar("receiver_name", { length: 120 }).notNull(),
  receiverPhone: varchar("receiver_phone", { length: 20 }).notNull(),
  receiverAddress: text("receiver_address").notNull(),

  parcelType: varchar("parcel_type", { length: 60 }).notNull(),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
  deliveryType: deliveryTypeEnum("delivery_type").notNull().default("standard"),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),

  status: parcelStatusEnum("status").notNull().default("booked"),

  riderId: uuid("rider_id").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parcelStatusHistory = pgTable("parcel_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  parcelId: uuid("parcel_id")
    .notNull()
    .references(() => parcels.id, { onDelete: "cascade" }),
  status: parcelStatusEnum("status").notNull(),
  note: text("note"),
  location: varchar("location", { length: 160 }),
  updatedById: uuid("updated_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  parcels: many(parcels),
}));

export const parcelsRelations = relations(parcels, ({ one, many }) => ({
  sender: one(users, {
    fields: [parcels.senderId],
    references: [users.id],
  }),
  rider: one(users, {
    fields: [parcels.riderId],
    references: [users.id],
  }),
  history: many(parcelStatusHistory),
}));

export const parcelStatusHistoryRelations = relations(
  parcelStatusHistory,
  ({ one }) => ({
    parcel: one(parcels, {
      fields: [parcelStatusHistory.parcelId],
      references: [parcels.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Parcel = typeof parcels.$inferSelect;
export type NewParcel = typeof parcels.$inferInsert;
export type ParcelStatus = (typeof parcelStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type DeliveryType = (typeof deliveryTypeEnum.enumValues)[number];
