import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table for multi-user support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Categories with user association
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // income or expense
  createdAt: timestamp("created_at").defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });

// Transactions with user association
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: varchar("type", { length: 10 }).notNull(), // income or expense
  categoryId: uuid("category_id").references(() => categories.id),
  paymentMethod: varchar("payment_method", { length: 20 }),
  creditCardId: uuid("credit_card_id"),
  installments: integer("installments"),
  installmentNumber: integer("installment_number"),
  parentTransactionId: uuid("parent_transaction_id"),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

// Credit Cards with user association
export const creditCards = pgTable("credit_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 50 }).notNull(),
  bank: varchar("bank", { length: 50 }).notNull(),
  limit: decimal("limit", { precision: 10, scale: 2 }).notNull(),
  currentUsed: decimal("current_used", { precision: 10, scale: 2 }).default("0"),
  color: varchar("color", { length: 7 }).notNull(),
  closingDay: integer("closing_day").notNull(),
  dueDay: integer("due_day").notNull(),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CreditCard = typeof creditCards.$inferSelect;
export type InsertCreditCard = typeof creditCards.$inferInsert;
export const insertCreditCardSchema = createInsertSchema(creditCards).omit({ id: true, createdAt: true });

// Subscriptions with user association
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  service: varchar("service", { length: 100 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  billingDate: integer("billing_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  creditCardId: uuid("credit_card_id"),
  categoryId: uuid("category_id").references(() => categories.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });

// Budgets with user association
export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, createdAt: true });

// Settings with user association
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, createdAt: true });

// Credit Card Invoices with user association
export const creditCardInvoices = pgTable("credit_card_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  creditCardId: uuid("credit_card_id").references(() => creditCards.id).notNull(),
  dueDate: timestamp("due_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CreditCardInvoice = typeof creditCardInvoices.$inferSelect;
export type InsertCreditCardInvoice = typeof creditCardInvoices.$inferInsert;
export const insertCreditCardInvoiceSchema = createInsertSchema(creditCardInvoices).omit({ id: true, createdAt: true });