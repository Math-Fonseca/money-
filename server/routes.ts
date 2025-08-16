import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// National and SP holidays (fixed and calculated dates)
function getBrazilianHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  
  // Fixed national holidays
  holidays.push(new Date(year, 0, 1));   // New Year
  holidays.push(new Date(year, 3, 21));  // Tiradentes
  holidays.push(new Date(year, 4, 1));   // Labor Day
  holidays.push(new Date(year, 8, 7));   // Independence Day
  holidays.push(new Date(year, 9, 12));  // Our Lady of Aparecida
  holidays.push(new Date(year, 10, 2));  // All Souls' Day
  holidays.push(new Date(year, 10, 15)); // Proclamation of the Republic
  holidays.push(new Date(year, 11, 25)); // Christmas
  
  // SP state holidays
  holidays.push(new Date(year, 6, 9));   // Constitutionalist Revolution (SP)
  
  // São Paulo city holidays
  holidays.push(new Date(year, 0, 25));  // São Paulo Anniversary
  holidays.push(new Date(year, 10, 20)); // Black Awareness Day (SP city)
  
  // Easter-based holidays (simplified calculation)
  const easter = getEasterDate(year);
  holidays.push(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000)); // Good Friday
  holidays.push(new Date(easter.getTime() + 60 * 24 * 60 * 60 * 1000)); // Corpus Christi
  
  return holidays;
}

// Simplified Easter calculation (Western)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Calculate working days (Monday to Friday) excluding holidays
function calculateWorkingDays(year: number, month: number): number {
  const date = new Date(year, month - 1, 1); // month is 1-based
  const lastDay = new Date(year, month, 0).getDate();
  const holidays = getBrazilianHolidays(year);
  let workingDays = 0;

  for (let day = 1; day <= lastDay; day++) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    
    // Check if it's a weekday (Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Check if it's not a holiday
      const isHoliday = holidays.some(holiday => 
        holiday.getDate() === day && 
        holiday.getMonth() === month - 1 && 
        holiday.getFullYear() === year
      );
      
      if (!isHoliday) {
        workingDays++;
      }
    }
  }

  return workingDays;
}

import { 
  insertTransactionSchema, 
  insertCategorySchema, 
  insertBudgetSchema, 
  insertCreditCardSchema,
  insertSubscriptionSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const category = insertCategorySchema.parse(req.body);
      const newCategory = await storage.createCategory(category);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCategory = await storage.updateCategory(id, updates);
      
      if (!updatedCategory) {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Transactions
  app.get("/api/transactions", async (req, res) => {
    try {
      const { startDate, endDate, categoryId } = req.query;
      
      let transactions;
      if (startDate && endDate) {
        transactions = await storage.getTransactionsByDateRange(
          startDate as string, 
          endDate as string
        );
      } else if (categoryId) {
        transactions = await storage.getTransactionsByCategory(categoryId as string);
      } else {
        transactions = await storage.getTransactions();
      }
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      
      // Handle installments for credit card purchases
      if (transactionData.installments && transactionData.installments > 1) {
        const parentTransaction = await storage.createTransaction({
          ...transactionData,
          installmentNumber: 1,
        });

        // Create additional installments
        const installmentAmount = parseFloat(transactionData.amount) / transactionData.installments;
        const promises = [];
        
        for (let i = 2; i <= transactionData.installments; i++) {
          const installmentDate = new Date(transactionData.date);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
          
          promises.push(storage.createTransaction({
            ...transactionData,
            amount: installmentAmount.toFixed(2),
            date: installmentDate.toISOString().split('T')[0],
            installmentNumber: i,
            parentTransactionId: parentTransaction.id,
          }));
        }
        
        await Promise.all(promises);
        
        // Update parent transaction amount to be the installment amount
        await storage.updateTransaction(parentTransaction.id, {
          amount: installmentAmount.toFixed(2),
        });
        
        res.status(201).json(parentTransaction);
      } else {
        const newTransaction = await storage.createTransaction(transactionData);
        res.status(201).json(newTransaction);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transaction" });
      }
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transactionData = insertTransactionSchema.partial().parse(req.body);
      const updatedTransaction = await storage.updateTransaction(id, transactionData);
      
      if (!updatedTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update transaction" });
      }
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTransaction(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Delete all recurring transactions by parent ID
  app.delete("/api/transactions/recurring/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      const deleted = await storage.deleteRecurringTransactions(parentId);
      
      if (!deleted) {
        res.status(404).json({ message: "Recurring transactions not found" });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recurring transactions" });
    }
  });

  // Update all recurring transactions by parent ID
  app.put("/api/transactions/recurring/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      const transactionData = insertTransactionSchema.partial().parse(req.body);
      const updated = await storage.updateRecurringTransactions(parentId, transactionData);
      
      if (!updated) {
        res.status(404).json({ message: "Recurring transactions not found" });
        return;
      }
      
      res.status(200).json({ message: "Recurring transactions updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update recurring transactions" });
      }
    }
  });

  // Financial summary endpoint
  app.get("/api/financial-summary", async (req, res) => {
    try {
      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
      
      const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
      const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
      
      const transactions = await storage.getTransactionsByDateRange(startDate, endDate);
      
      // Get all settings
      const settings = await storage.getSettings();
      const salarySetting = settings.find(s => s.key === 'salary');
      const vtSetting = settings.find(s => s.key === 'dailyVT');
      const vrSetting = settings.find(s => s.key === 'dailyVR');
      
      const monthlySalary = salarySetting ? parseFloat(salarySetting.value) : 0;
      const dailyVT = vtSetting ? parseFloat(vtSetting.value) : 0;
      const dailyVR = vrSetting ? parseFloat(vrSetting.value) : 0;
      
      // Calculate working days for the specific month
      const workingDaysInMonth = calculateWorkingDays(targetYear, targetMonth);
      const monthlyVT = dailyVT * workingDaysInMonth;
      const monthlyVR = dailyVR * workingDaysInMonth;
      
      const transactionIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Include salary, VT and VR in total income
      const totalIncome = transactionIncome + monthlySalary + monthlyVT + monthlyVR;
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const currentBalance = totalIncome - totalExpenses;
      
      // Calculate expenses by category
      const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc: Record<string, number>, t) => {
          if (t.categoryId) {
            acc[t.categoryId] = (acc[t.categoryId] || 0) + parseFloat(t.amount);
          }
          return acc;
        }, {});
      
      res.json({
        totalIncome,
        totalExpenses,
        currentBalance,
        expensesByCategory,
        monthlySalary,
        monthlyVT,
        monthlyVR,
        transactionIncome,
        transactions: transactions.slice(0, 10), // Recent transactions
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  // Budgets
  app.get("/api/budgets", async (req, res) => {
    try {
      const { month, year } = req.query;
      
      let budgets;
      if (month && year) {
        budgets = await storage.getBudgetsByMonth(
          parseInt(month as string), 
          parseInt(year as string)
        );
      } else {
        budgets = await storage.getBudgets();
      }
      
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const budget = insertBudgetSchema.parse(req.body);
      const newBudget = await storage.createBudget(budget);
      res.status(201).json(newBudget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create budget" });
      }
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        res.status(400).json({ message: "Key and value are required" });
        return;
      }
      
      const setting = await storage.createOrUpdateSetting({ key, value });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to save setting" });
    }
  });

  // Credit Cards
  app.get("/api/credit-cards", async (req, res) => {
    try {
      const creditCards = await storage.getCreditCards();
      res.json(creditCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch credit cards" });
    }
  });

  app.post("/api/credit-cards", async (req, res) => {
    try {
      const creditCard = insertCreditCardSchema.parse(req.body);
      const newCreditCard = await storage.createCreditCard(creditCard);
      res.status(201).json(newCreditCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid credit card data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create credit card" });
      }
    }
  });

  app.put("/api/credit-cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCard = await storage.updateCreditCard(id, updates);
      
      if (!updatedCard) {
        res.status(404).json({ message: "Credit card not found" });
        return;
      }
      
      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to update credit card" });
    }
  });

  // Rota para buscar transações de cartão de crédito por período
  app.get("/api/transactions/credit-card/:cardId/:startDate/:endDate", async (req, res) => {
    try {
      const { cardId, startDate, endDate } = req.params;
      
      // Buscar transações do cartão no período específico
      const transactions = await storage.getTransactions();
      const cardTransactions = transactions.filter(t => 
        t.creditCardId === cardId && 
        t.date >= startDate && 
        t.date <= endDate
      );
      
      res.json(cardTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações do cartão:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para buscar faturas de cartão de crédito
  app.get("/api/credit-card-invoices/:cardId/:dueDate", async (req, res) => {
    try {
      const { cardId, dueDate } = req.params;
      
      // Buscar ou criar fatura para a data específica
      let invoice = await storage.getCreditCardInvoiceByCardAndDate?.(cardId, dueDate);
      
      if (!invoice) {
        // Criar nova fatura se não existir
        invoice = await storage.createCreditCardInvoice?.({
          creditCardId: cardId,
          dueDate: dueDate,
          totalAmount: "0",
          paidAmount: "0",
          status: "pending"
        });
      }
      
      res.json(invoice || { totalAmount: "0", paidAmount: "0", status: "pending" });
    } catch (error) {
      console.error("Erro ao buscar fatura do cartão:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/credit-cards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCreditCard(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Credit card not found" });
        return;
      }
      
      res.json({ message: "Credit card deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete credit card" });
    }
  });

  // Subscriptions
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const { active } = req.query;
      
      let subscriptions;
      if (active === 'true') {
        subscriptions = await storage.getActiveSubscriptions();
      } else {
        subscriptions = await storage.getSubscriptions();
      }
      
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const subscription = insertSubscriptionSchema.parse(req.body);
      const newSubscription = await storage.createSubscription(subscription);
      res.status(201).json(newSubscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create subscription" });
      }
    }
  });

  app.put("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedSubscription = await storage.updateSubscription(id, updates);
      
      if (!updatedSubscription) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }
      
      res.json(updatedSubscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSubscription(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Subscription not found" });
        return;
      }
      
      res.json({ message: "Subscription deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
