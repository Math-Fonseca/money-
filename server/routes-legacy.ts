import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";

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

  // Financial summary route (legacy)
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
      
      // Calculate income and expenses
      const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
      const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Add active subscriptions to expenses
      const activeSubscriptions = subscriptions.filter(s => s.isActive);
      const subscriptionExpenses = activeSubscriptions
        .reduce((sum, s) => sum + parseFloat(s.amount), 0);
      
      const totalExpensesWithSubscriptions = totalExpenses + subscriptionExpenses;
      const currentBalance = totalIncome - totalExpensesWithSubscriptions;
      
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
        totalBudget,
        budgetUsed,
        budgetRemaining: Math.max(0, totalBudget - budgetUsed),
        activeSubscriptions: activeSubscriptions.length,
        totalSubscriptionAmount: subscriptionExpenses
      });
    } catch (error) {
      console.error("Error calculating financial summary:", error);
      res.status(500).json({ message: "Failed to calculate financial summary" });
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

  const httpServer = createServer(app);
  return httpServer;
}