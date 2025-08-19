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
  insertSubscriptionSchema,
  type Transaction
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
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
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
      
      // Verificar limite do cartão de crédito antes de criar a transação
      if (transactionData.creditCardId && transactionData.type === 'expense') {
        const creditCard = await storage.getCreditCardById(transactionData.creditCardId);
        if (creditCard) {
          const currentUsed = parseFloat(creditCard.currentUsed || "0");
          const cardLimit = parseFloat(creditCard.limit);
          const transactionAmount = parseFloat(transactionData.amount);
          
          // Verificar se a transação excede o limite disponível
          if (currentUsed + transactionAmount > cardLimit) {
            const availableLimit = cardLimit - currentUsed;
            return res.status(400).json({ 
              message: "Limite do cartão insuficiente", 
              error: `Limite disponível: R$ ${availableLimit.toFixed(2)}. Valor da transação: R$ ${transactionAmount.toFixed(2)}` 
            });
          }
        }
      }
      
      // Handle installments for credit card purchases - CORRIGIDO DEFINITIVAMENTE
      if (transactionData.installments && transactionData.installments > 1) {
        const totalAmount = parseFloat(transactionData.amount);
        const installmentAmount = totalAmount / transactionData.installments;
        
        // Create parent transaction (first installment) with CORRECT installment amount
        const parentTransaction = await storage.createTransaction({
          ...transactionData,
          amount: installmentAmount.toFixed(2), // ⚡️ VALOR DA PARCELA, NÃO DO TOTAL
          installmentNumber: 1,
          isInstallment: true,
          installments: transactionData.installments,
        });

        // Create additional installments
        const promises = [];
        
        for (let i = 2; i <= transactionData.installments; i++) {
          const installmentDate = new Date(transactionData.date);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
          
          promises.push(storage.createTransaction({
            ...transactionData,
            amount: installmentAmount.toFixed(2), // ⚡️ VALOR INDIVIDUAL DA PARCELA
            date: installmentDate.toISOString().split('T')[0],
            installmentNumber: i,
            parentTransactionId: parentTransaction.id,
            isInstallment: true, // ⚡️ MARCAR COMO PARCELA
            installments: transactionData.installments // ⚡️ MANTER INFO DE PARCELAS
          }));
        }
        
        await Promise.all(promises);

        // ⚡️ ATUALIZAR LIMITE DO CARTÃO COM VALOR TOTAL - DEFINITIVO
        if (transactionData.creditCardId && transactionData.type === 'expense') {
          const creditCard = await storage.getCreditCardById(transactionData.creditCardId);
          if (creditCard) {
            const currentUsed = parseFloat(creditCard.currentUsed || "0");
            const newCurrentUsed = currentUsed + totalAmount;
            
            await storage.updateCreditCard(transactionData.creditCardId, {
              currentUsed: newCurrentUsed.toFixed(2)
            });
          }
        }
        
        res.status(201).json(parentTransaction);
      } else {
        const newTransaction = await storage.createTransaction(transactionData);
        
        // Se for uma transação de cartão de crédito, atualizar o limite usado
        if (newTransaction.creditCardId && newTransaction.type === 'expense') {
          const creditCard = await storage.getCreditCardById(newTransaction.creditCardId);
          if (creditCard) {
            const currentUsed = parseFloat(creditCard.currentUsed || "0");
            const transactionAmount = parseFloat(newTransaction.amount);
            const newCurrentUsed = currentUsed + transactionAmount;
            
            await storage.updateCreditCard(newTransaction.creditCardId, {
              currentUsed: newCurrentUsed.toFixed(2)
            });
          }
        }
        
        res.status(201).json(newTransaction);
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "Failed to create transaction", error: errorMessage });
      }
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transactionData = insertTransactionSchema.partial().parse(req.body);
      
      // Buscar transação original para calcular diferença no limite do cartão
      const originalTransaction = await storage.getTransactionById(id);
      if (!originalTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      
      const updatedTransaction = await storage.updateTransaction(id, transactionData);
      
      if (!updatedTransaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      
      // Atualizar limite do cartão se necessário
      if (originalTransaction.creditCardId && originalTransaction.type === 'expense') {
        const creditCard = await storage.getCreditCardById(originalTransaction.creditCardId);
        if (creditCard) {
          const currentUsed = parseFloat(creditCard.currentUsed || "0");
          const originalAmount = parseFloat(originalTransaction.amount);
          const newAmount = transactionData.amount ? parseFloat(transactionData.amount) : originalAmount;
          
          // Calcular nova utilização: remover valor original e adicionar novo valor
          const adjustedUsed = currentUsed - originalAmount + newAmount;
          
          await storage.updateCreditCard(originalTransaction.creditCardId, {
            currentUsed: Math.max(0, adjustedUsed).toFixed(2)
          });
        }
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
      
      // Buscar a transação antes de deletar para verificar se é de cartão de crédito
      const transaction = await storage.getTransactionById(id);
      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      
      const deleted = await storage.deleteTransaction(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }
      
      // Se foi uma transação de cartão de crédito, reduzir o limite usado
      if (transaction.creditCardId && transaction.type === 'expense') {
        const creditCard = await storage.getCreditCardById(transaction.creditCardId);
        if (creditCard) {
          const currentUsed = parseFloat(creditCard.currentUsed || "0");
          const transactionAmount = parseFloat(transaction.amount);
          const newCurrentUsed = Math.max(0, currentUsed - transactionAmount);
          
          await storage.updateCreditCard(transaction.creditCardId, {
            currentUsed: newCurrentUsed.toFixed(2)
          });
        }
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Delete all installments of a transaction
  app.delete("/api/transactions/installments/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      console.log(`[${new Date().toISOString()}] DELETE_ALL_INSTALLMENTS`, {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        data: req.body
      });
      
      // Get the parent transaction to find all related installments
      const parentTransaction = await storage.getTransactionById(parentId);
      if (!parentTransaction) {
        res.status(404).json({ message: "Parent transaction not found" });
        return;
      }
      
      // Get all transactions that belong to this installment group
      const allTransactions = await storage.getTransactions();
      const installmentTransactions = allTransactions.filter((t: Transaction) => 
        t.parentTransactionId === parentId || t.id === parentId
      );
      
      // Delete all installment transactions and update credit card limits
      for (const transaction of installmentTransactions) {
        // Update credit card limit before deleting
        if (transaction.creditCardId && transaction.type === 'expense') {
          const creditCard = await storage.getCreditCardById(transaction.creditCardId);
          if (creditCard) {
            const currentUsed = parseFloat(creditCard.currentUsed || "0");
            const transactionAmount = parseFloat(transaction.amount);
            const newCurrentUsed = Math.max(0, currentUsed - transactionAmount);
            
            await storage.updateCreditCard(transaction.creditCardId, {
              currentUsed: newCurrentUsed.toFixed(2)
            });
          }
        }
        
        await storage.deleteTransaction(transaction.id);
      }
      
      console.log(`Deleted ${installmentTransactions.length} installment transactions`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting installments:", error);
      res.status(500).json({ message: "Failed to delete installments" });
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

  // Delete all installment transactions by parent ID (including parent) - CORRIGIDO
  app.delete("/api/transactions/installments/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      
      // Buscar todas as parcelas (incluindo a principal) para calcular o total a ser removido do limite
      const transactions = await storage.getTransactions();
      const installmentTransactions = transactions.filter(t => 
        t.id === parentId || t.parentTransactionId === parentId
      );
      
      if (installmentTransactions.length === 0) {
        res.status(404).json({ message: "Installment transactions not found" });
        return;
      }
      
      // Calcular total para remover do limite do cartão
      const creditCardTransaction = installmentTransactions.find(t => t.creditCardId);
      if (creditCardTransaction && creditCardTransaction.type === 'expense' && creditCardTransaction.creditCardId) {
        // Para parcelas, remover o valor total da transação original, não a soma das parcelas
        const parentTransaction = installmentTransactions.find(t => !t.parentTransactionId);
        const totalOriginalAmount = parentTransaction ? parseFloat(parentTransaction.amount) * (parentTransaction.installments || 1) : 0;
        const creditCard = await storage.getCreditCardById(creditCardTransaction.creditCardId);
        
        if (creditCard) {
          const currentUsed = parseFloat(creditCard.currentUsed || "0");
          const newCurrentUsed = Math.max(0, currentUsed - totalOriginalAmount);
          
          await storage.updateCreditCard(creditCardTransaction.creditCardId, {
            currentUsed: newCurrentUsed.toFixed(2)
          });
        }
      }
      
      // Deletar todas as parcelas
      for (const transaction of installmentTransactions) {
        await storage.deleteTransaction(transaction.id);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting installment transactions:", error);
      res.status(500).json({ message: "Failed to delete installment transactions" });
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

  // Update all installment transactions by parent ID
  app.put("/api/transactions/installments/:parentId", async (req, res) => {
    try {
      const { parentId } = req.params;
      const transactionData = insertTransactionSchema.partial().parse(req.body);
      
      // Get all installment transactions (parent + children)
      const installmentTransactions = await storage.getInstallmentTransactions(parentId);
      
      if (!installmentTransactions || installmentTransactions.length === 0) {
        res.status(404).json({ message: "Installment transactions not found" });
        return;
      }

      // Handle proportional amount updates
      if ((transactionData as any).proportionalAmount && transactionData.amount) {
        const newAmount = parseFloat(transactionData.amount);
        
        // Get the current parent transaction to calculate the total change
        const parentTransaction = installmentTransactions.find((t: Transaction) => t.id === parentId);
        if (!parentTransaction) {
          res.status(404).json({ message: "Parent transaction not found" });
          return;
        }

        const oldParentAmount = parseFloat(parentTransaction.amount);
        const totalOldAmount = oldParentAmount * installmentTransactions.length;
        const totalNewAmount = newAmount * installmentTransactions.length;
        
        // Update credit card limit if this is a credit transaction
        if (parentTransaction.creditCardId && parentTransaction.type === 'expense') {
          const creditCard = await storage.getCreditCardById(parentTransaction.creditCardId);
          if (creditCard) {
            const currentUsed = parseFloat(creditCard.currentUsed || "0");
            const limitAdjustment = totalNewAmount - totalOldAmount;
            const newCurrentUsed = currentUsed + limitAdjustment;
            
            // Check if new amount exceeds limit
            const cardLimit = parseFloat(creditCard.limit);
            if (newCurrentUsed > cardLimit) {
              const availableLimit = cardLimit - (currentUsed - totalOldAmount);
              return res.status(400).json({ 
                message: "Limite do cartão insuficiente para a alteração", 
                error: `Limite disponível: R$ ${availableLimit.toFixed(2)}. Valor total das parcelas: R$ ${totalNewAmount.toFixed(2)}` 
              });
            }
            
            await storage.updateCreditCard(parentTransaction.creditCardId, {
              currentUsed: newCurrentUsed.toFixed(2)
            });
          }
        }

        // Update all installments with the new amount
        const updatePromises = installmentTransactions.map((transaction: Transaction) => {
          const { proportionalAmount, ...cleanTransactionData } = transactionData as any;
          return storage.updateTransaction(transaction.id, {
            ...cleanTransactionData,
            amount: newAmount.toFixed(2)
          });
        });
        
        await Promise.all(updatePromises);
      } else {
        // Regular update for all installments
        const updatePromises = installmentTransactions.map((transaction: Transaction) => 
          storage.updateTransaction(transaction.id, transactionData)
        );
        
        await Promise.all(updatePromises);
      }
      
      res.status(200).json({ message: "Installment transactions updated successfully" });
    } catch (error) {
      console.error("Error updating installment transactions:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "Failed to update installment transactions", error: errorMessage });
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
      
      console.log('Financial summary calculated:', {
        monthlySalary,
        monthlyVT,
        monthlyVR,
        transactionIncome,
        totalIncome
      });
      
      // Calcular despesas das transações - IMPORTANTE: Cartões de crédito devem ser contabilizados no mês de vencimento da fatura
      let transactionExpenses = 0;
      
      // Buscar todos os cartões de crédito para aplicar lógica de ciclo de faturamento
      const creditCards = await storage.getCreditCards();
      
      // Primeiro, calcular transações que NÃO são de cartão de crédito (contabilizadas normalmente)
      const nonCreditTransactions = transactions.filter(t => t.type === 'expense' && !t.creditCardId);
      transactionExpenses += nonCreditTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Depois, buscar transações de cartão de crédito que devem aparecer NESTE mês baseado no ciclo de faturamento
      for (const card of creditCards) {
        const cardTransactions = await storage.getTransactions();
        
        // Para cada transação de cartão, verificar se ela deve ser contabilizada neste mês
        const relevantCardTransactions = cardTransactions.filter(t => {
          if (t.type !== 'expense' || t.creditCardId !== card.id) return false;
          
          // Calcular em que mês esta transação deve aparecer na fatura
          const transactionDate = new Date(t.date);
          const closingDay = card.closingDay || 1;
          
          // Se a compra foi feita ANTES do fechamento, vai para a fatura do mês seguinte
          // Se foi feita DEPOIS do fechamento, vai para a fatura do mês seguinte ao seguinte
          let invoiceMonth = transactionDate.getMonth() + 1; // mês seguinte
          let invoiceYear = transactionDate.getFullYear();
          
          // Se a compra foi feita após o dia de fechamento do mês atual, empurra para o próximo mês
          if (transactionDate.getDate() > closingDay) {
            invoiceMonth += 1;
          }
          
          // Ajustar ano se necessário
          if (invoiceMonth > 12) {
            invoiceMonth = 1;
            invoiceYear += 1;
          }
          
          // Verificar se esta transação deve aparecer no mês que estamos calculando
          return invoiceMonth === targetMonth && invoiceYear === targetYear;
        });
        
        // Somar transações relevantes deste cartão
        transactionExpenses += relevantCardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      }
      
      // Calcular despesas das assinaturas ativas no mês - aplicando lógica de cartão de crédito quando necessário
      const subscriptions = await storage.getActiveSubscriptions();
      let subscriptionExpenses = 0;
      
      for (const sub of subscriptions) {
        // Se a assinatura é paga via cartão de crédito, aplicar lógica de ciclo de faturamento
        if (sub.paymentMethod === 'credito' && sub.creditCardId) {
          const card = creditCards.find(c => c.id === sub.creditCardId);
          if (card) {
            const closingDay = card.closingDay || 1;
            const billingDate = sub.billingDate || 1;
            
            // Calcular em que mês a assinatura deve aparecer baseado no ciclo de faturamento
            let invoiceMonth = targetMonth;
            let invoiceYear = targetYear;
            
            // Se a data de cobrança da assinatura é depois do fechamento do cartão,
            // ela aparece na fatura do mês seguinte
            if (billingDate > closingDay) {
              invoiceMonth -= 1;
              if (invoiceMonth < 1) {
                invoiceMonth = 12;
                invoiceYear -= 1;
              }
            }
            
            // A assinatura deve ser contabilizada neste mês se a data de cobrança se alinha
            subscriptionExpenses += parseFloat(sub.amount);
          }
        } else {
          // Assinaturas não pagas via cartão de crédito são contabilizadas normalmente
          subscriptionExpenses += parseFloat(sub.amount);
        }
      }
      
      const totalExpenses = transactionExpenses + subscriptionExpenses;
      
      const currentBalance = totalIncome - totalExpenses;
      
      // Calculate expenses by category (incluindo assinaturas) - aplicando a mesma lógica de ciclo de faturamento
      const expensesByCategory: Record<string, number> = {};
      
      // Adicionar TODAS as transações de despesa do mês atual (independente do método de pagamento)
      const currentMonthTransactions = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() + 1 === targetMonth && 
               transactionDate.getFullYear() === targetYear;
      });
      
      currentMonthTransactions.forEach(t => {
        if (t.categoryId) {
          expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + parseFloat(t.amount);
        }
      });
      
      // As transações de cartão já foram incluídas acima junto com todas as outras
      
      // Adicionar assinaturas ativas por categoria
      subscriptions.forEach(sub => {
        if (sub.categoryId) {
          expensesByCategory[sub.categoryId] = (expensesByCategory[sub.categoryId] || 0) + parseFloat(sub.amount);
        }
      });
      
      res.json({
        totalIncome,
        totalExpenses,
        currentBalance,
        expensesByCategory,
        monthlySalary,
        monthlyVT,
        monthlyVR,
        transactionIncome,
        transactionExpenses,
        subscriptionExpenses,
        activeSubscriptions: subscriptions.length,
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
      console.log('Settings received:', { key, value, body: req.body });
      
      if (!key || value === undefined) {
        console.log('Missing key or value');
        res.status(400).json({ message: "Key and value are required" });
        return;
      }
      
      const setting = await storage.createOrUpdateSetting({ key, value });
      console.log('Setting saved:', setting);
      res.json(setting);
    } catch (error) {
      console.error('Error saving setting:', error);
      res.status(500).json({ message: "Failed to save setting" });
    }
  });

  // ⚡️ MIDDLEWARE PARA FECHAMENTO AUTOMÁTICO DE FATURAS
  const autoCloseInvoices = async () => {
    try {
      const creditCards = await storage.getCreditCards();
      const today = new Date();
      
      for (const card of creditCards) {
        // Verificar faturas dos últimos 3 meses para fechar automaticamente
        for (let monthsAgo = 0; monthsAgo <= 3; monthsAgo++) {
          const checkDate = new Date(today);
          checkDate.setMonth(checkDate.getMonth() - monthsAgo);
          
          const year = checkDate.getFullYear();
          const month = checkDate.getMonth();
          const closingDay = card.closingDay;
          
          // Data de fechamento da fatura
          const closingDate = new Date(year, month, closingDay);
          
          // Se a data de fechamento já passou, fechar a fatura
          if (today > closingDate) {
            const endDateStr = closingDate.toISOString().split('T')[0];
            
            try {
              // Buscar faturas existentes para este cartão e período
              const allInvoices = await storage.getCreditCardInvoices();
              // Como não temos campo endDate no schema, vamos usar dueDate para verificar
              const dueDate = new Date(year, month + 1, card.dueDay).toISOString().split('T')[0];
              const existingInvoice = allInvoices.find(inv => 
                inv.creditCardId === card.id && inv.dueDate === dueDate
              );
              
              // Se não existe fatura ou está pendente, criar/atualizar para fechada
              if (!existingInvoice) {
                // Buscar transações para calcular valor da fatura
                const startDate = new Date(year, month - 1, closingDay + 1);
                const endDate = closingDate;
                
                const transactions = await storage.getTransactionsByDateRange(
                  startDate.toISOString().split('T')[0],
                  endDate.toISOString().split('T')[0]
                );
                
                const cardTransactions = transactions.filter(t => 
                  t.creditCardId === card.id && t.type === 'expense'
                );
                
                const subscriptions = await storage.getActiveSubscriptions();
                const cardSubscriptions = subscriptions.filter(s => 
                  s.creditCardId === card.id && s.paymentMethod === 'credito'
                );
                
                const totalAmount = cardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) +
                                 cardSubscriptions.reduce((sum, s) => sum + parseFloat(s.amount), 0);
                
                // Criar fatura fechada automaticamente
                if (totalAmount > 0) {
                  await storage.createCreditCardInvoice({
                    creditCardId: card.id,
                    dueDate: new Date(year, month + 1, card.dueDay).toISOString().split('T')[0],
                    totalAmount: totalAmount.toString(),
                    paidAmount: "0",
                    status: "closed", // ⚡️ STATUS FECHADO AUTOMATICAMENTE
                  });
                }
              } else if (existingInvoice.status === 'pending') {
                // Atualizar fatura pendente para fechada
                await storage.updateCreditCardInvoice(existingInvoice.id, {
                  status: "closed"
                });
              }
            } catch (invoiceError) {
              console.log(`Erro ao processar fatura do cartão ${card.name}:`, invoiceError);
            }
          }
        }
      }
    } catch (error) {
      console.log('Erro no fechamento automático de faturas:', error);
    }
  };

  // Credit Cards
  app.get("/api/credit-cards", async (req, res) => {
    try {
      // ⚡️ EXECUTAR FECHAMENTO AUTOMÁTICO ANTES DE RETORNAR CARTÕES
      await autoCloseInvoices();
      
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

  // Rota para registrar pagamento de fatura
  app.put("/api/credit-card-invoices/:invoiceId/pay", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { amount } = req.body;
      
      console.log('Pagamento recebido:', { invoiceId, amount, body: req.body });
      
      const invoice = await storage.getCreditCardInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Fatura não encontrada" });
      }
      
      const currentPaidAmount = parseFloat(invoice.paidAmount || "0");
      const paymentAmount = parseFloat(amount || "0");
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const totalAmount = parseFloat(invoice.totalAmount || "0");
      
      let newStatus = "pending";
      if (newPaidAmount >= totalAmount && totalAmount > 0) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partial";
      }
      
      // Atualizar a fatura
      const updatedInvoice = await storage.updateCreditCardInvoice(invoiceId, {
        paidAmount: newPaidAmount.toFixed(2),
        status: newStatus
      });
      
      // Atualizar o limite usado do cartão após pagamento
      const creditCard = await storage.getCreditCardById(invoice.creditCardId);
      if (creditCard) {
        const currentUsed = parseFloat(creditCard.currentUsed || "0");
        let newCurrentUsed = Math.max(0, currentUsed - paymentAmount);
        
        // Se o pagamento quitou totalmente a fatura, precisamos considerar as assinaturas do próximo mês
        if (newStatus === "paid") {
          // Buscar assinaturas ativas deste cartão para reservar o limite para o próximo mês
          const subscriptions = await storage.getActiveSubscriptions();
          const cardSubscriptions = subscriptions.filter(s => 
            s.paymentMethod === 'credito' && 
            s.creditCardId === invoice.creditCardId && 
            s.isActive
          );
          
          // Calcular valor total das assinaturas para reservar no limite
          const nextMonthSubscriptionAmount = cardSubscriptions.reduce((sum, sub) => {
            return sum + parseFloat(sub.amount);
          }, 0);
          
          // Reservar o limite para as assinaturas do próximo mês
          newCurrentUsed += nextMonthSubscriptionAmount;
          
          console.log(`Fatura paga totalmente. Limite atualizado considerando assinaturas do próximo mês: R$ ${nextMonthSubscriptionAmount.toFixed(2)}`);
        }
        
        await storage.updateCreditCard(invoice.creditCardId, {
          currentUsed: newCurrentUsed.toFixed(2)
        });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
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

  // Get subscriptions for credit card in specific period
  app.get("/api/subscriptions/credit-card/:creditCardId/:startDate/:endDate", async (req, res) => {
    try {
      const { creditCardId, startDate, endDate } = req.params;
      const subscriptions = await storage.getSubscriptions();
      
      // Filter active subscriptions for this credit card
      const creditCardSubscriptions = subscriptions.filter(subscription => 
        subscription.creditCardId === creditCardId && 
        subscription.paymentMethod === 'credito' &&
        subscription.isActive
      );

      // ⚡️ TRANSFORMAR ASSINATURAS EM FORMATO DE TRANSAÇÃO PARA FATURA
      const subscriptionTransactions = creditCardSubscriptions.map(subscription => ({
        id: `subscription-${subscription.id}`,
        description: `🔄 ${subscription.name} (Assinatura)`,
        amount: subscription.amount,
        date: startDate, // Data de início do período da fatura
        type: 'expense' as const,
        categoryId: subscription.categoryId,
        paymentMethod: 'credito',
        isSubscription: true,
        subscriptionId: subscription.id
      }));
      
      res.json(subscriptionTransactions);
    } catch (error) {
      console.error("Error fetching credit card subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch credit card subscriptions" });
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
