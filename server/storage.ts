import { 
  type Category, 
  type InsertCategory,
  type Transaction,
  type InsertTransaction,
  type Budget,
  type InsertBudget,
  type Setting,
  type InsertSetting,
  type CreditCard,
  type InsertCreditCard,
  type Subscription,
  type InsertSubscription,
  type CreditCardInvoice,
  type InsertCreditCardInvoice
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;
  getTransactionsByCategory(categoryId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  deleteRecurringTransactions(parentId: string): Promise<boolean>;
  updateRecurringTransactions(parentId: string, transaction: Partial<InsertTransaction>): Promise<boolean>;
  getInstallmentTransactions(parentId: string): Promise<Transaction[]>;
  deleteInstallmentTransactions(parentId: string): Promise<boolean>;

  // Budgets
  getBudgets(): Promise<Budget[]>;
  getBudgetsByMonth(month: number, year: number): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: string): Promise<boolean>;

  // Settings
  getSettings(): Promise<Setting[]>;
  getSettingByKey(key: string): Promise<Setting | undefined>;
  createOrUpdateSetting(setting: InsertSetting): Promise<Setting>;

  // Credit Cards
  getCreditCards(): Promise<CreditCard[]>;
  getCreditCardById(id: string): Promise<CreditCard | undefined>;
  createCreditCard(creditCard: InsertCreditCard): Promise<CreditCard>;
  updateCreditCard(id: string, creditCard: Partial<CreditCard>): Promise<CreditCard | undefined>;
  deleteCreditCard(id: string): Promise<boolean>;

  // Subscriptions
  getSubscriptions(): Promise<Subscription[]>;
  getActiveSubscriptions(): Promise<Subscription[]>;
  getSubscriptionById(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private categories: Map<string, Category> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private budgets: Map<string, Budget> = new Map();
  private settings: Map<string, Setting> = new Map();
  private creditCards: Map<string, CreditCard> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private creditCardInvoices: Map<string, CreditCardInvoice> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Default expense categories
    const expenseCategories: InsertCategory[] = [
      { name: "Alimentação", icon: "🍔", color: "#EF4444", type: "expense" },
      { name: "Transporte", icon: "🚗", color: "#F59E0B", type: "expense" },
      { name: "Moradia", icon: "🏠", color: "#8B5CF6", type: "expense" },
      { name: "Saúde", icon: "🏥", color: "#10B981", type: "expense" },
      { name: "Educação", icon: "📚", color: "#2563EB", type: "expense" },
      { name: "Lazer", icon: "🎭", color: "#EC4899", type: "expense" },
      { name: "Roupas", icon: "👕", color: "#06B6D4", type: "expense" },
      { name: "Contas", icon: "📄", color: "#6B7280", type: "expense" },
      { name: "Outros", icon: "📦", color: "#84CC16", type: "expense" },
    ];

    // Default income categories
    const incomeCategories: InsertCategory[] = [
      { name: "Salário", icon: "💰", color: "#10B981", type: "income" },
      { name: "Vale Transporte", icon: "🚇", color: "#2563EB", type: "income" },
      { name: "Vale Refeição", icon: "🍽️", color: "#F59E0B", type: "income" },
      { name: "Freelance", icon: "💻", color: "#8B5CF6", type: "income" },
      { name: "Bônus", icon: "🎁", color: "#EC4899", type: "income" },
      { name: "Outros", icon: "💵", color: "#6B7280", type: "income" },
    ];

    [...expenseCategories, ...incomeCategories].forEach(cat => {
      const id = randomUUID();
      this.categories.set(id, { ...cat, id });
    });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    
    const updated: Category = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => 
      t.date >= startDate && t.date <= endDate
    );
  }

  async getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => 
      t.categoryId === categoryId
    );
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const newTransaction: Transaction = { 
      ...transaction, 
      id,
      categoryId: transaction.categoryId || null,
      paymentMethod: transaction.paymentMethod || null,
      creditCardId: transaction.creditCardId || null,
      isRecurring: transaction.isRecurring || null,
      installments: transaction.installments || null,
      installmentNumber: transaction.installmentNumber || null,
      parentTransactionId: transaction.parentTransactionId || null,
      createdAt: new Date()
    };
    this.transactions.set(id, newTransaction);

    // If it's a recurring transaction, create future instances
    if (transaction.isRecurring) {
      await this.createRecurringInstances(newTransaction);
    }
    
    return newTransaction;
  }

  private async createRecurringInstances(baseTransaction: Transaction): Promise<void> {
    const startDate = new Date(baseTransaction.date);
    const currentYear = new Date().getFullYear();
    
    // Create instances for the next 24 months from the start date
    for (let i = 1; i <= 24; i++) {
      const nextDate = new Date(startDate);
      nextDate.setMonth(startDate.getMonth() + i);
      
      // Stop if we go too far into the future (more than 2 years)
      if (nextDate.getFullYear() > currentYear + 2) break;
      
      const recurringId = randomUUID();
      const recurringTransaction: Transaction = {
        ...baseTransaction,
        id: recurringId,
        date: nextDate.toISOString().split('T')[0],
        parentTransactionId: baseTransaction.id,
        installmentNumber: baseTransaction.installmentNumber || 1,
        createdAt: new Date()
      };
      
      this.transactions.set(recurringId, recurringTransaction);
    }
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    
    const updated: Transaction = { ...existing, ...transaction };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  async deleteRecurringTransactions(parentId: string): Promise<boolean> {
    let deleted = false;
    
    // Delete the parent transaction
    if (this.transactions.delete(parentId)) {
      deleted = true;
    }
    
    // Delete all recurring instances (children)
    const transactionEntries = Array.from(this.transactions.entries());
    for (const [id, transaction] of transactionEntries) {
      if (transaction.parentTransactionId === parentId) {
        this.transactions.delete(id);
        deleted = true;
      }
    }
    
    return deleted;
  }

  async updateRecurringTransactions(parentId: string, updates: Partial<InsertTransaction>): Promise<boolean> {
    let updated = false;
    
    // Update the parent transaction
    const parentTransaction = this.transactions.get(parentId);
    if (parentTransaction) {
      const updatedParent: Transaction = { ...parentTransaction, ...updates };
      this.transactions.set(parentId, updatedParent);
      updated = true;
    }
    
    // Update all recurring instances (children)
    const transactionEntries = Array.from(this.transactions.entries());
    for (const [id, transaction] of transactionEntries) {
      if (transaction.parentTransactionId === parentId) {
        const updatedChild: Transaction = { ...transaction, ...updates };
        this.transactions.set(id, updatedChild);
        updated = true;
      }
    }
    
    return updated;
  }

  async getInstallmentTransactions(parentId: string): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    
    // Get the parent transaction (first installment)
    const parentTransaction = this.transactions.get(parentId);
    if (parentTransaction && (parentTransaction.installments || 0) > 1) {
      transactions.push(parentTransaction);
    }
    
    // Get all child transactions (subsequent installments)
    const transactionEntries = Array.from(this.transactions.entries());
    for (const [id, transaction] of transactionEntries) {
      if (transaction.parentTransactionId === parentId) {
        transactions.push(transaction);
      }
    }
    
    // Sort by installment number to maintain order
    return transactions.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
  }

  async deleteInstallmentTransactions(parentId: string): Promise<boolean> {
    let deleted = false;
    
    // Delete the parent transaction (first installment)
    const parentTransaction = this.transactions.get(parentId);
    if (parentTransaction && (parentTransaction.installments || 0) > 1) {
      
      // If this is a credit card transaction, adjust the limit
      if (parentTransaction.creditCardId && parentTransaction.type === 'expense') {
        const creditCard = await this.getCreditCardById(parentTransaction.creditCardId);
        if (creditCard) {
          const currentUsed = parseFloat(creditCard.currentUsed || "0");
          
          // For installments, calculate the total amount to release
          const installmentTransactions = await this.getInstallmentTransactions(parentId);
          const totalAmount = installmentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          
          const newCurrentUsed = Math.max(0, currentUsed - totalAmount);
          await this.updateCreditCard(parentTransaction.creditCardId, {
            currentUsed: newCurrentUsed.toFixed(2)
          });
        }
      }
      
      this.transactions.delete(parentId);
      deleted = true;
    }
    
    // Delete all child transactions (subsequent installments)
    const transactionEntries = Array.from(this.transactions.entries());
    for (const [id, transaction] of transactionEntries) {
      if (transaction.parentTransactionId === parentId) {
        this.transactions.delete(id);
        deleted = true;
      }
    }
    
    return deleted;
  }

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }

  async getBudgetsByMonth(month: number, year: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(b => 
      b.month === month && b.year === year
    );
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const id = randomUUID();
    const newBudget: Budget = { 
      ...budget, 
      id,
      categoryId: budget.categoryId || null
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }

  async updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget | undefined> {
    const existing = this.budgets.get(id);
    if (!existing) return undefined;
    
    const updated: Budget = { ...existing, ...budget };
    this.budgets.set(id, updated);
    return updated;
  }

  async deleteBudget(id: string): Promise<boolean> {
    return this.budgets.delete(id);
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSettingByKey(key: string): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(s => s.key === key);
  }

  async createOrUpdateSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSettingByKey(setting.key);
    if (existing) {
      const updated: Setting = { ...existing, value: setting.value };
      this.settings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const newSetting: Setting = { ...setting, id };
      this.settings.set(id, newSetting);
      return newSetting;
    }
  }

  // Credit Cards
  async getCreditCards(): Promise<CreditCard[]> {
    return Array.from(this.creditCards.values()).filter(c => c.isActive);
  }

  async getCreditCardById(id: string): Promise<CreditCard | undefined> {
    return this.creditCards.get(id);
  }

  async createCreditCard(creditCard: InsertCreditCard): Promise<CreditCard> {
    const id = randomUUID();
    const newCreditCard: CreditCard = { 
      ...creditCard, 
      id,
      color: creditCard.color || "#3B82F6",
      currentUsed: "0",
      isActive: true,
      isBlocked: creditCard.isBlocked || false,
      createdAt: new Date()
    };
    this.creditCards.set(id, newCreditCard);
    return newCreditCard;
  }

  async updateCreditCard(id: string, creditCard: Partial<CreditCard>): Promise<CreditCard | undefined> {
    const existing = this.creditCards.get(id);
    if (!existing) return undefined;
    
    const updated: CreditCard = { ...existing, ...creditCard };
    this.creditCards.set(id, updated);
    return updated;
  }

  async deleteCreditCard(id: string): Promise<boolean> {
    return this.creditCards.delete(id);
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getActiveSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(s => s.isActive);
  }

  async getSubscriptionById(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const newSubscription: Subscription = { 
      ...subscription, 
      id,
      categoryId: subscription.categoryId || null,
      isActive: subscription.isActive !== false,
      creditCardId: subscription.creditCardId || null,
      createdAt: new Date()
    };
    
    // Se é uma assinatura paga no cartão de crédito, atualizar o limite usado
    if (subscription.paymentMethod === 'credito' && subscription.creditCardId && newSubscription.isActive) {
      const creditCard = await this.getCreditCardById(subscription.creditCardId);
      if (creditCard) {
        const currentUsed = parseFloat(creditCard.currentUsed || "0");
        const subscriptionAmount = parseFloat(subscription.amount);
        const newCurrentUsed = currentUsed + subscriptionAmount;
        
        await this.updateCreditCard(subscription.creditCardId, {
          currentUsed: newCurrentUsed.toFixed(2)
        });
      }
    }
    
    this.subscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const existing = this.subscriptions.get(id);
    if (!existing) return undefined;
    
    // Handle credit card limit adjustments when subscription status changes
    if (existing.paymentMethod === 'credito' && existing.creditCardId) {
      const wasActive = existing.isActive;
      const willBeActive = subscription.isActive !== undefined ? subscription.isActive : existing.isActive;
      
      if (wasActive !== willBeActive) {
        const creditCard = await this.getCreditCardById(existing.creditCardId);
        if (creditCard) {
          const currentUsed = parseFloat(creditCard.currentUsed || "0");
          const subscriptionAmount = parseFloat(existing.amount);
          
          let newCurrentUsed;
          if (willBeActive && !wasActive) {
            // Activating subscription - add to limit usage
            newCurrentUsed = currentUsed + subscriptionAmount;
          } else if (!willBeActive && wasActive) {
            // Deactivating subscription - remove from limit usage
            newCurrentUsed = Math.max(0, currentUsed - subscriptionAmount);
          } else {
            newCurrentUsed = currentUsed;
          }
          
          await this.updateCreditCard(existing.creditCardId, {
            currentUsed: newCurrentUsed.toFixed(2)
          });
        }
      }
    }
    
    const updated: Subscription = { ...existing, ...subscription };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const subscription = this.subscriptions.get(id);
    
    // Se é uma assinatura ativa paga no cartão de crédito, liberar o limite
    if (subscription && subscription.paymentMethod === 'credito' && subscription.creditCardId && subscription.isActive) {
      const creditCard = await this.getCreditCardById(subscription.creditCardId);
      if (creditCard) {
        const currentUsed = parseFloat(creditCard.currentUsed || "0");
        const subscriptionAmount = parseFloat(subscription.amount);
        const newCurrentUsed = Math.max(0, currentUsed - subscriptionAmount);
        
        await this.updateCreditCard(subscription.creditCardId, {
          currentUsed: newCurrentUsed.toFixed(2)
        });
      }
    }
    
    return this.subscriptions.delete(id);
  }

  // Credit Card Invoices
  async getCreditCardInvoices(): Promise<CreditCardInvoice[]> {
    return Array.from(this.creditCardInvoices.values());
  }

  async getCreditCardInvoiceById(id: string): Promise<CreditCardInvoice | undefined> {
    return this.creditCardInvoices.get(id);
  }

  async getCreditCardInvoicesByCard(creditCardId: string): Promise<CreditCardInvoice[]> {
    return Array.from(this.creditCardInvoices.values()).filter(i => i.creditCardId === creditCardId);
  }

  async getCreditCardInvoiceByCardAndDate(creditCardId: string, dueDate: string): Promise<CreditCardInvoice | undefined> {
    return Array.from(this.creditCardInvoices.values()).find(i => 
      i.creditCardId === creditCardId && i.dueDate === dueDate
    );
  }

  async createCreditCardInvoice(invoice: InsertCreditCardInvoice): Promise<CreditCardInvoice> {
    const id = randomUUID();
    const newInvoice: CreditCardInvoice = { 
      ...invoice, 
      id,
      status: invoice.status || "pending",
      totalAmount: invoice.totalAmount || "0",
      paidAmount: invoice.paidAmount || "0",
      isInstallment: invoice.isInstallment || false,
      installmentCount: invoice.installmentCount || null,
      installmentNumber: invoice.installmentNumber || null,
      parentInvoiceId: invoice.parentInvoiceId || null,
      createdAt: new Date()
    };
    this.creditCardInvoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateCreditCardInvoice(id: string, invoice: Partial<InsertCreditCardInvoice>): Promise<CreditCardInvoice | undefined> {
    const existing = this.creditCardInvoices.get(id);
    if (!existing) return undefined;
    
    const updated: CreditCardInvoice = { ...existing, ...invoice };
    this.creditCardInvoices.set(id, updated);
    return updated;
  }

  async deleteCreditCardInvoice(id: string): Promise<boolean> {
    return this.creditCardInvoices.delete(id);
  }
}

export const storage = new MemStorage();
