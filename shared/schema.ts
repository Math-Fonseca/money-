import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, date, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  categoryId: varchar("category_id").references(() => categories.id),
  paymentMethod: text("payment_method"), // 'dinheiro', 'debito', 'credito', 'pix', 'transferencia'
  isRecurring: boolean("is_recurring").default(false),
  installments: integer("installments").default(1),
  installmentNumber: integer("installment_number").default(1),
  parentTransactionId: varchar("parent_transaction_id"), // for installments
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// Add icon options schema for category creation
export const iconOptionsSchema = z.object({
  income: z.array(z.string()).default([
    "💰", "💵", "💸", "🏦", "💎", "🎁", "💳", "🪙", 
    "📊", "📈", "💹", "🚇", "🍽️", "💻", "🎯", "⚡"
  ]),
  expense: z.array(z.string()).default([
    "🍔", "🚗", "🏠", "🏥", "📚", "🎭", "👕", "📄", 
    "📦", "⚡", "🛒", "🎮", "🎬", "🏃", "💊", "🔧"
  ])
});

export const colorOptionsSchema = z.object({
  colors: z.array(z.string()).default([
    "#EF4444", "#F59E0B", "#10B981", "#2563EB", "#8B5CF6", 
    "#EC4899", "#06B6D4", "#84CC16", "#6B7280", "#F97316",
    "#14B8A6", "#3B82F6", "#7C3AED", "#DB2777", "#0EA5E9"
  ])
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
