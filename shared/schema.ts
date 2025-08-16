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
  creditCardId: varchar("credit_card_id").references(() => creditCards.id), // for credit card expenses
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

export const creditCards = pgTable("credit_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand").notNull(), // 'mastercard', 'visa', 'elo', 'american-express'
  bank: text("bank").notNull(), // 'nubank', 'itau', 'bradesco', 'santander', etc.
  limit: decimal("limit", { precision: 10, scale: 2 }).notNull(),
  currentUsed: decimal("current_used", { precision: 10, scale: 2 }).default("0"),
  color: text("color").notNull().default("#3B82F6"),
  closingDay: integer("closing_day").notNull(),
  dueDay: integer("due_day").notNull(),
  isActive: boolean("is_active").default(true),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  service: text("service").notNull(), // 'spotify', 'netflix', 'amazon-prime', etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  billingDate: integer("billing_date").notNull(), // day of month
  isActive: boolean("is_active").default(true),
  categoryId: varchar("category_id").references(() => categories.id),
  paymentMethod: text("payment_method").notNull(), // 'dinheiro', 'debito', 'credito', 'pix', 'transferencia'
  creditCardId: varchar("credit_card_id").references(() => creditCards.id), // for credit card subscriptions
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditCardInvoices = pgTable("credit_card_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creditCardId: varchar("credit_card_id").notNull().references(() => creditCards.id, { onDelete: "cascade" }),
  dueDate: varchar("due_date").notNull(),
  totalAmount: varchar("total_amount").notNull().default("0"),
  paidAmount: varchar("paid_amount").notNull().default("0"),
  status: varchar("status").notNull().default("pending"), // pending, paid, partial, overdue
  isInstallment: boolean("is_installment").default(false),
  installmentCount: integer("installment_count"),
  installmentNumber: integer("installment_number"),
  parentInvoiceId: varchar("parent_invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expanded icon options with more categories
export const iconOptionsSchema = z.object({
  income: z.array(z.string()).default([
    "💰", "💵", "💸", "🏦", "💎", "🎁", "💳", "🪙", 
    "📊", "📈", "💹", "🚇", "🍽️", "💻", "🎯", "⚡",
    "🏢", "👨‍💼", "📝", "🎓", "🏆", "💼", "🔧", "🎨"
  ]),
  expense: z.array(z.string()).default([
    "🍔", "🚗", "🏠", "🏥", "📚", "🎭", "👕", "📄", 
    "📦", "⚡", "🛒", "🎮", "🎬", "🏃", "💊", "🔧",
    "✈️", "🏖️", "🎪", "🍕", "☕", "🚌", "🚕", "🎵",
    "📱", "💡", "🧽", "🍺", "🎂", "💇‍♀️", "🦷", "🐕"
  ])
});

// Credit card brand icons
export const creditCardBrands = z.object({
  brands: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string()
  })).default([
    { id: 'mastercard', name: 'MasterCard', icon: '💳' },
    { id: 'visa', name: 'Visa', icon: '💳' },
    { id: 'elo', name: 'Elo', icon: '💳' },
    { id: 'american-express', name: 'American Express', icon: '💳' },
    { id: 'hipercard', name: 'Hipercard', icon: '💳' }
  ])
});

// Bank icons
export const bankIcons = z.object({
  banks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    color: z.string()
  })).default([
    { id: 'nubank', name: 'Nubank', icon: '🏦', color: '#8A05BE' },
    { id: 'itau', name: 'Itaú', icon: '🏦', color: '#F37900' },
    { id: 'bradesco', name: 'Bradesco', icon: '🏦', color: '#CC092F' },
    { id: 'santander', name: 'Santander', icon: '🏦', color: '#EC0000' },
    { id: 'caixa', name: 'Caixa', icon: '🏦', color: '#0066CC' },
    { id: 'bb', name: 'Banco do Brasil', icon: '🏦', color: '#FBB040' },
    { id: 'mercado-pago', name: 'Mercado Pago', icon: '🏦', color: '#009EE3' },
    { id: 'inter', name: 'Inter', icon: '🏦', color: '#FF7A00' },
    { id: 'c6', name: 'C6 Bank', icon: '🏦', color: '#FFD500' }
  ])
});

// Subscription service icons
export const subscriptionServices = z.object({
  services: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    color: z.string()
  })).default([
    { id: 'spotify', name: 'Spotify', icon: '🎵', color: '#1DB954' },
    { id: 'netflix', name: 'Netflix', icon: '🎬', color: '#E50914' },
    { id: 'amazon-prime', name: 'Amazon Prime', icon: '📦', color: '#FF9900' },
    { id: 'disney-plus', name: 'Disney+', icon: '🏰', color: '#113CCF' },
    { id: 'youtube-premium', name: 'YouTube Premium', icon: '🎥', color: '#FF0000' },
    { id: 'paramount-plus', name: 'Paramount+', icon: '⭐', color: '#0064FF' },
    { id: 'hbo-max', name: 'HBO Max', icon: '🎭', color: '#8B5CF6' },
    { id: 'apple-tv', name: 'Apple TV+', icon: '📺', color: '#000000' },
    { id: 'meli-plus', name: 'Meli+', icon: '📦', color: '#FFE600' },
    { id: 'vivo', name: 'Vivo', icon: '📱', color: '#8B1538' },
    { id: 'claro', name: 'Claro', icon: '📱', color: '#FF0000' },
    { id: 'tim', name: 'TIM', icon: '📱', color: '#4169E1' },
    { id: 'smartfit', name: 'Smart Fit', icon: '🏃', color: '#FFD700' },
    { id: 'panobianco', name: 'Panobianco', icon: '🏋️', color: '#FF6B35' },
    { id: 'ifood', name: 'iFood', icon: '🍔', color: '#EA1D2C' },
    { id: 'uber-eats', name: 'Uber Eats', icon: '🍕', color: '#06C167' },
    { id: 'rappi', name: 'Rappi', icon: '🛵', color: '#FF441F' },
    { id: 'ea-play', name: 'EA Play', icon: '🎮', color: '#FF6C11' },
    { id: 'xbox-gamepass', name: 'Xbox Game Pass', icon: '🎮', color: '#107C10' },
    { id: 'playstation-plus', name: 'PlayStation Plus', icon: '🎮', color: '#003791' }
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

export const insertCreditCardSchema = createInsertSchema(creditCards).omit({
  id: true,
  createdAt: true,
  currentUsed: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertCreditCardInvoiceSchema = createInsertSchema(creditCardInvoices).omit({
  id: true,
  createdAt: true,
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type CreditCard = typeof creditCards.$inferSelect;
export type InsertCreditCard = z.infer<typeof insertCreditCardSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type CreditCardInvoice = typeof creditCardInvoices.$inferSelect;
export type InsertCreditCardInvoice = z.infer<typeof insertCreditCardInvoiceSchema>;
