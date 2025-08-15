import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
      
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
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
