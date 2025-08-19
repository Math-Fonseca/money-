import type { Express } from "express";
import { createServer, type Server } from "http";
import { TransactionController } from "./controllers/TransactionController";
import { CreditCardController } from "./controllers/CreditCardController";
import { registerLegacyRoutes } from "./routes-legacy";
import { storage } from "./storage";

/**
 * Register MVC routes with proper controller structure
 */
export async function registerMVCRoutes(app: Express): Promise<Server> {
  
  // Initialize controllers
  const transactionController = new TransactionController(storage);
  const creditCardController = new CreditCardController(storage);

  // Transaction routes
  app.get("/api/transactions", transactionController.getAllTransactions);
  app.post("/api/transactions", transactionController.createTransaction);
  app.put("/api/transactions/:id", transactionController.updateTransaction);
  app.delete("/api/transactions/:id", transactionController.deleteTransaction);
  app.delete("/api/transactions/recurring/:parentId", transactionController.deleteRecurringTransactions);
  app.delete("/api/transactions/installments/:parentId", transactionController.deleteInstallmentTransactions);
  app.put("/api/transactions/installments/:parentId", transactionController.updateInstallmentTransactions);
  
  // Transaction statistics and filtering
  app.get("/api/transactions/statistics", transactionController.getTransactionStatistics);
  app.get("/api/transactions/payment-method/:paymentMethod", transactionController.getTransactionsByPaymentMethod);
  app.get("/api/transactions/recurring", transactionController.getRecurringTransactions);
  app.get("/api/transactions/installments", transactionController.getInstallmentTransactions);

  // Credit Card routes
  app.get("/api/credit-cards", creditCardController.getAllCreditCards);
  app.get("/api/credit-cards/:id", creditCardController.getCreditCardById);
  app.post("/api/credit-cards", creditCardController.createCreditCard);
  app.put("/api/credit-cards/:id", creditCardController.updateCreditCard);
  app.delete("/api/credit-cards/:id", creditCardController.deleteCreditCard);
  
  // Credit Card management
  app.patch("/api/credit-cards/:id/block", creditCardController.toggleCreditCardBlock);
  app.patch("/api/credit-cards/:id/active", creditCardController.toggleCreditCardActive);
  app.post("/api/credit-cards/:id/payment", creditCardController.processPayment);
  app.post("/api/credit-cards/:id/validate-purchase", creditCardController.validatePurchase);
  
  // Credit Card reporting
  app.get("/api/credit-cards/:creditCardId/invoice", creditCardController.calculateInvoice);
  app.get("/api/credit-cards/:id/statistics", creditCardController.getUsageStatistics);
  app.get("/api/credit-cards/summary", creditCardController.getCreditCardsSummary);

  // Register legacy routes (categories, subscriptions, budgets, financial summary)
  // These maintain backwards compatibility while MVC migration is in progress
  await registerLegacyRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}