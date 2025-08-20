import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
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

/**
 * Legacy routes - keeping existing functionality while MVC is being implemented
 * This file maintains backwards compatibility for categories, subscriptions, budgets, etc.
 * These will be migrated to MVC pattern in future iterations
 */
export async function registerLegacyRoutes(app: Express): Promise<Server> {
  
  // Categories routes (legacy)
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name, icon, color, type } = req.body;
      if (!name || !icon || !color || !type) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const category = await storage.createCategory({
        name,
        icon,
        color,
        type,
      });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Financial summary route with VT/VR/salary support
  app.get("/api/financial-summary", async (req, res) => {
    try {
      const month = req.query.month as string;
      const year = req.query.year as string;
      
      const transactions = await storage.getTransactions();
      const subscriptions = await storage.getSubscriptions();
      const budgets = await storage.getBudgets();
      
      // Filter transactions by month/year if specified
      let filteredTransactions = transactions;
      if (month && year) {
        filteredTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() + 1 === parseInt(month) && 
                 transactionDate.getFullYear() === parseInt(year);
        });
      }
      
      // Get all settings for salary, VT, VR
      const settings = await storage.getSettings();
      const salarySetting = settings.find(s => s.key === 'salary');
      const vtSetting = settings.find(s => s.key === 'dailyVT');
      const vrSetting = settings.find(s => s.key === 'dailyVR');
      
      const monthlySalary = salarySetting ? parseFloat(salarySetting.value) : 0;
      const dailyVT = vtSetting ? parseFloat(vtSetting.value) : 0;
      const dailyVR = vrSetting ? parseFloat(vrSetting.value) : 0;
      
      // Calculate working days for the specific month
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();
      const workingDaysInMonth = calculateWorkingDays(targetYear, targetMonth);
      const monthlyVT = dailyVT * workingDaysInMonth;
      const monthlyVR = dailyVR * workingDaysInMonth;

      // Calculate income and expenses
      const transactionIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Include salary, VT and VR in total income
      const totalIncome = transactionIncome + monthlySalary + monthlyVT + monthlyVR;
        
      const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Add active subscriptions to expenses
      const activeSubscriptions = subscriptions.filter(s => s.isActive);
      const subscriptionExpenses = activeSubscriptions
        .reduce((sum, s) => sum + parseFloat(s.amount), 0);
      
      const totalExpensesWithSubscriptions = totalExpenses + subscriptionExpenses;
      const currentBalance = totalIncome - totalExpensesWithSubscriptions;
      
      // Calculate expenses by category
      const expensesByCategory: Record<string, number> = {};
      
      // Add expenses from transactions
      filteredTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          if (t.categoryId) {
            expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + parseFloat(t.amount);
          }
        });
      
      // Add expenses from subscriptions
      activeSubscriptions.forEach(sub => {
        if (sub.categoryId) {
          expensesByCategory[sub.categoryId] = (expensesByCategory[sub.categoryId] || 0) + parseFloat(sub.amount);
        }
      });
      
      console.log('Legacy route - expensesByCategory:', expensesByCategory);
      
      // Calculate budget summary
      const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const budgetUsed = budgets.reduce((sum, b) => {
        const categoryExpenses = filteredTransactions
          .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
          .reduce((catSum, t) => catSum + parseFloat(t.amount), 0);
        return sum + categoryExpenses;
      }, 0);
      
      res.json({
        totalIncome,
        totalExpenses: totalExpensesWithSubscriptions,
        currentBalance,
        expensesByCategory,
        totalBudget,
        budgetUsed,
        budgetRemaining: Math.max(0, totalBudget - budgetUsed),
        activeSubscriptions: activeSubscriptions.length,
        totalSubscriptionAmount: subscriptionExpenses,
        monthlySalary,
        monthlyVT,
        monthlyVR,
        transactionIncome
      });
    } catch (error) {
      console.error("Error calculating financial summary:", error);
      res.status(500).json({ message: "Failed to calculate financial summary" });
    }
  });

  // Credit card transaction route
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
      
      // Buscar apenas assinaturas ATIVAS do cartão
      const subscriptions = await storage.getActiveSubscriptions();
      const cardSubscriptions = subscriptions.filter(s => 
        s.paymentMethod === 'credito' && s.creditCardId === cardId && s.isActive
      );
      
      // Converter assinaturas em transações virtuais para a fatura
      const subscriptionTransactions = cardSubscriptions.map(sub => {
        // Calcular a data da próxima cobrança baseada no período da fatura
        const startDateObj = new Date(startDate);
        const billingDate = Math.min(sub.billingDate, new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, 0).getDate());
        const transactionDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), billingDate);
        
        return {
          id: `subscription-${sub.id}`,
          description: `${sub.name} (Assinatura)`,
          amount: sub.amount,
          date: transactionDate.toISOString().split('T')[0],
          type: 'expense' as const,
          categoryId: sub.categoryId,
          creditCardId: cardId,
          isSubscription: true,
          subscriptionId: sub.id,
          createdAt: sub.createdAt
        };
      });
      
      // Combinar transações normais com assinaturas
      const allTransactions = [...cardTransactions, ...subscriptionTransactions]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json(allTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações do cartão:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Credit card invoice route
  app.get("/api/credit-card-invoices/:cardId/:dueDate", async (req, res) => {
    try {
      const { cardId, dueDate } = req.params;
      
      // Create a default invoice structure for now
      const invoice = {
        id: `invoice-${cardId}-${dueDate}`,
        creditCardId: cardId,
        dueDate: dueDate,
        totalAmount: "0",
        paidAmount: "0",
        status: "pending"
      };
      
      res.json(invoice);
    } catch (error) {
      console.error("Erro ao buscar fatura do cartão:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Subscriptions routes (legacy)
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const subscription = await storage.createSubscription(req.body);
      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.put("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await storage.updateSubscription(id, req.body);
      res.json(subscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubscription(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  // Credit card subscription route (legacy)
  app.get("/api/subscriptions/credit-card/:creditCardId/:startDate/:endDate", async (req, res) => {
    try {
      const { creditCardId, startDate, endDate } = req.params;
      
      const subscriptions = await storage.getSubscriptions();
      const creditCardSubscriptions = subscriptions.filter(subscription => {
        return subscription.creditCardId === creditCardId && 
               subscription.paymentMethod === 'credito' &&
               subscription.isActive;
      });
      
      res.json(creditCardSubscriptions);
    } catch (error) {
      console.error("Error fetching credit card subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch credit card subscriptions" });
    }
  });

  // Budgets routes (legacy)
  app.get("/api/budgets", async (req, res) => {
    try {
      const budgets = await storage.getBudgets();
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const budget = await storage.createBudget(req.body);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.updateBudget(id, req.body);
      res.json(budget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBudget(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Settings routes (missing from MVC)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const setting = await storage.createOrUpdateSetting(req.body);
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating setting:", error);
      res.status(500).json({ message: "Failed to create setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.createOrUpdateSetting({ key, ...req.body });
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Categories UPDATE route (missing from MVC)
  app.put("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateCategory(id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}