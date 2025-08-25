import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import subscriptionRoutes from "./subscription-routes";
import { CreditCardService } from "./services/CreditCardService";

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
      console.log('Categories request received');
      const categories = await storage.getCategories();
      console.log('Categories found:', categories.length);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      
      // Handle installments for credit card purchases - VALOR INDIVIDUAL POR PARCELA
      if (transactionData.installments && transactionData.installments > 1) {
        const totalAmount = parseFloat(transactionData.amount);
        const installmentAmount = totalAmount / transactionData.installments;
        
        // Create parent transaction (first installment) - VALOR INDIVIDUAL DA PARCELA
        const parentTransaction = await storage.createTransaction({
          ...transactionData,
          amount: installmentAmount.toFixed(2), // VALOR POR PARCELA: R$ 500/3 = R$ 166,67
          installmentNumber: 1,
          isInstallment: true,
          installments: transactionData.installments,
        });
        
        console.log(`PARCELA CRIADA: ${parentTransaction.amount} (Total: ${totalAmount}, Parcelas: ${transactionData.installments})`);

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

        // ⚡️ ATUALIZAR LIMITE DO CARTÃO COM VALOR TOTAL DA COMPRA
        if (transactionData.creditCardId && transactionData.type === 'expense') {
          const creditCard = await storage.getCreditCardById(transactionData.creditCardId);
          if (creditCard) {
            const currentUsed = parseFloat(creditCard.currentUsed || "0");
            const newCurrentUsed = currentUsed + totalAmount; // R$ 500 TOTAL
            
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
          
          console.log(`Transação excluída: ${transaction.description} - R$ ${transaction.amount}`);
          console.log(`Limite do cartão atualizado: R$ ${currentUsed} → R$ ${newCurrentUsed}`);
          
          await storage.updateCreditCard(transaction.creditCardId, {
            currentUsed: newCurrentUsed.toFixed(2)
          });
          
          // CORREÇÃO: RECALCULAR EFETIVAMENTE A FATURA APÓS EXCLUSÃO
          console.log(`Transação de cartão excluída: ${transaction.description} - R$ ${transaction.amount}`);
          console.log(`Recalculando faturas do cartão ${transaction.creditCardId}...`);
          
          // Buscar todas as faturas do cartão para recalcular
          const cardInvoices = await storage.getCreditCardInvoicesByCard(transaction.creditCardId);
          
          for (const cardInvoice of cardInvoices) {
            // Buscar o cartão para obter o dia de fechamento
            const cardForInvoice = await storage.getCreditCardById(transaction.creditCardId);
            if (!cardForInvoice) continue;
            
            const closingDay = cardForInvoice.closingDay;
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            // Calcular período da fatura
            let invoiceStartDate: string;
            let invoiceEndDate: string;
            
            if (closingDay === 1) {
              invoiceStartDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
              invoiceEndDate = new Date(currentYear, currentMonth, 31).toISOString().split('T')[0];
            } else {
              invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay).toISOString().split('T')[0];
              invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1).toISOString().split('T')[0];
            }
            
            // Buscar transações ATUAIS do período da fatura
            const allTransactions = await storage.getTransactions();
            const invoiceTransactions = allTransactions.filter(t => 
              t.creditCardId === transaction.creditCardId &&
              t.date >= invoiceStartDate &&
              t.date <= invoiceEndDate
            );
            
            // Calcular novo valor total da fatura
            const newTotalAmount = invoiceTransactions.reduce((sum, t) => 
              sum + parseFloat(t.amount), 0
            );
            
            // CORREÇÃO: Recalcular valor pago como se a transação nunca existiu
            const currentInvoice = await storage.getCreditCardInvoiceById(cardInvoice.id);
            if (currentInvoice) {
              const currentPaidAmount = parseFloat(currentInvoice.paidAmount || "0");
              
              // CORREÇÃO DEFINITIVA: Se excluí transação, ZERAR PAGAMENTO (como se nunca existiu)
              const originalTotalAmount = parseFloat(currentInvoice.totalAmount || "0");
              const transactionAmountDeleted = originalTotalAmount - newTotalAmount;
              let newPaidAmount = currentPaidAmount;
              
              if (newTotalAmount === 0) {
                // Se não há mais transações, ZERAR TUDO
                newPaidAmount = 0;
                console.log(`🔥 TODAS transações excluídas - zerando pagamento`);
              } else if (transactionAmountDeleted > 0) {
                // LÓGICA NOVA: Se excluí transação, reduzir o valor pago proporcionalmente
                // Exemplo: Total R$ 100, Pago R$ 100, Excluí R$ 50 → Total R$ 50, Pago R$ 0
                const paymentPercentage = currentPaidAmount / originalTotalAmount;
                newPaidAmount = newTotalAmount * paymentPercentage;
                
                // CORREÇÃO: Se o usuário quer que seja ZERADO quando excluir, fazer isso:
                newPaidAmount = 0; // ZERAR PAGAMENTO QUANDO EXCLUIR QUALQUER TRANSAÇÃO
                
                console.log(`🔥 Transação excluída (R$ ${transactionAmountDeleted.toFixed(2)}) - ZERANDO pagamento`);
                console.log(`   - Total original: R$ ${originalTotalAmount.toFixed(2)}`);
                console.log(`   - Total novo: R$ ${newTotalAmount.toFixed(2)}`);
                console.log(`   - Pago original: R$ ${currentPaidAmount.toFixed(2)}`);
                console.log(`   - Pago novo: R$ ${newPaidAmount.toFixed(2)} (ZERADO)`);
              } else {
                // Se não excluí nada, manter valor pago
                newPaidAmount = currentPaidAmount;
                console.log(`✅ Nenhuma transação excluída - mantendo pagamento R$ ${newPaidAmount.toFixed(2)}`);
              }
              
              // Atualizar a fatura com o novo valor total e valor pago ajustado
              await storage.updateCreditCardInvoice(cardInvoice.id, {
                totalAmount: newTotalAmount.toFixed(2),
                paidAmount: newPaidAmount.toFixed(2)
              });
              
              console.log(`✅ Fatura ${cardInvoice.id} recalculada após exclusão:`);
              console.log(`   - Total anterior: R$ ${currentInvoice.totalAmount}`);
              console.log(`   - Total novo: R$ ${newTotalAmount.toFixed(2)}`);
              console.log(`   - Pago anterior: R$ ${currentPaidAmount}`);
              console.log(`   - Pago novo: R$ ${newPaidAmount.toFixed(2)}`);
              console.log(`   - Transações restantes: ${invoiceTransactions.length}`);
            }
          }
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
      console.log(`Cache das faturas será invalidado para atualizar os limites.`);
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
      
      // CORREÇÃO: Log para debug e invalidação de cache
      console.log(`Transações recorrentes excluídas com sucesso. Cache das faturas será invalidado.`);
      
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
      
      // CORREÇÃO: Log para debug e invalidação de cache
      console.log(`Parcelas excluídas com sucesso. Cache das faturas será invalidado.`);
      
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
      console.log('Financial summary request received:', req.query);
      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
      
      console.log('Target month/year:', { targetMonth, targetYear });
      
      const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
      const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
      
      console.log('Date range:', { startDate, endDate });
      
      const transactions = await storage.getTransactionsByDateRange(startDate, endDate);
      console.log('Transactions found:', transactions.length);
      
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
        // ⚠️ CORREÇÃO: Usar apenas transações do mês específico, não todas as transações
        const cardTransactions = transactions.filter(t => t.creditCardId === card.id);
        
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
        const cardExpenses = relevantCardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        transactionExpenses += cardExpenses;
        
        console.log(`Cartão ${card.name}: R$ ${cardExpenses.toFixed(2)} em transações para o mês ${targetMonth}/${targetYear}`);
        
        // Adicionar despesas de cartão de crédito por categoria para o dashboard
        relevantCardTransactions.forEach(t => {
          if (t.categoryId) {
            expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + parseFloat(t.amount);
            console.log(`Added credit card transaction to category ${t.categoryId}: R$ ${t.amount}`);
          }
        });
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
            
            // Adicionar assinatura de cartão de crédito por categoria para o dashboard
            if (sub.categoryId) {
              expensesByCategory[sub.categoryId] = (expensesByCategory[sub.categoryId] || 0) + parseFloat(sub.amount);
              console.log(`Added credit card subscription to category ${sub.categoryId}: R$ ${sub.amount}`);
            }
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
      
      console.log('Calculating expenses by category for:', { targetMonth, targetYear });
      console.log('Total transactions found:', transactions.length);
      
      // Adicionar apenas transações de despesa que NÃO são de cartão de crédito
      // As despesas de cartão de crédito já foram calculadas acima na lógica de ciclo de faturamento
      const currentMonthTransactions = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        
        // EXCLUIR transações de cartão de crédito - elas já foram contabilizadas acima
        if (t.creditCardId) {
          console.log('Excluding credit card transaction from general expenses:', {
            id: t.id,
            description: t.description,
            amount: t.amount,
            creditCardId: t.creditCardId
          });
          return false;
        }
        
        const transactionDate = new Date(t.date);
        const transactionMonth = transactionDate.getMonth() + 1;
        const transactionYear = transactionDate.getFullYear();
        const matches = transactionMonth === targetMonth && transactionYear === targetYear;
        
        if (matches) {
          console.log('Found non-credit expense transaction:', {
            id: t.id,
            description: t.description,
            amount: t.amount,
            categoryId: t.categoryId,
            date: t.date,
            transactionMonth,
            transactionYear
          });
        }
        
        return matches;
      });
      
      console.log('Current month expense transactions:', currentMonthTransactions.length);
      
      currentMonthTransactions.forEach(t => {
        if (t.categoryId) {
          const currentAmount = expensesByCategory[t.categoryId] || 0;
          const newAmount = currentAmount + parseFloat(t.amount);
          expensesByCategory[t.categoryId] = newAmount;
          console.log('Added to category:', {
            categoryId: t.categoryId,
            amount: t.amount,
            totalForCategory: newAmount
          });
        } else {
          console.log('Transaction without categoryId:', t.id);
        }
      });
      
      // As transações de cartão já foram incluídas acima junto com todas as outras
      
      // Adicionar assinaturas ativas por categoria (apenas as que não são de cartão de crédito)
      // As assinaturas de cartão de crédito já foram contabilizadas na lógica de transações acima
      subscriptions.forEach(sub => {
        // EXCLUIR assinaturas de cartão de crédito - elas já foram contabilizadas acima
        if (sub.paymentMethod === 'credito' && sub.creditCardId) {
          console.log('Excluding credit card subscription from general expenses:', {
            id: sub.id,
            name: sub.name,
            amount: sub.amount,
            creditCardId: sub.creditCardId
          });
          return;
        }
        
        if (sub.categoryId) {
          expensesByCategory[sub.categoryId] = (expensesByCategory[sub.categoryId] || 0) + parseFloat(sub.amount);
          console.log('Added subscription to category:', {
            categoryId: sub.categoryId,
            subscriptionName: sub.name,
            amount: sub.amount,
            totalForCategory: expensesByCategory[sub.categoryId]
          });
        }
      });
      
      console.log('Final expensesByCategory:', expensesByCategory);
      console.log('Response being sent:', {
        totalIncome,
        totalExpenses,
        currentBalance,
        expensesByCategory,
        expensesByCategoryKeys: Object.keys(expensesByCategory),
        expensesByCategoryValues: Object.values(expensesByCategory)
      });
      
      const responseData = {
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
      };
      
      console.log('Response data object:', responseData);
      console.log('Response JSON string:', JSON.stringify(responseData));
      
      res.json(responseData);
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

  // ⚠️ ENDPOINT DE EMERGÊNCIA: Limpar todas as transações
  app.delete("/api/transactions/clear-all", async (req, res) => {
    try {
      await storage.clearAllTransactions();
      res.json({ message: "Todas as transações foram removidas com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao limpar transações" });
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
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const closingDay = card.closingDay || 1;
        
        // Calcular período da fatura atual
        let invoiceStartDate: Date;
        let invoiceEndDate: Date;
        
        if (closingDay === 1) {
          invoiceStartDate = new Date(currentYear, currentMonth, 1);
          invoiceEndDate = new Date(currentYear, currentMonth + 1, 0);
        } else {
          invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
          invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);
        }
        
        // Verificar se a fatura atual já fechou
        if (today > invoiceEndDate) {
          // 🔥 NOVA LÓGICA: Usar sistema de limite inteligente para fechar fatura
          const creditCardService = new CreditCardService(storage);
          try {
            await creditCardService.calculateSmartLimit(card.id);
            console.log(`🔥 Fatura fechada automaticamente para cartão ${card.name}`);
          } catch (error) {
            console.error(`Erro ao fechar fatura do cartão ${card.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erro no fechamento automático de faturas:', error);
    }
  };

  // ⚡️ FUNÇÃO PARA RECALCULAR LIMITE USADO DO CARTÃO (SIMPLIFICADA)
  const recalculateCreditCardLimit = async (creditCardId: string) => {
    try {
      const creditCard = await storage.getCreditCardById(creditCardId);
      if (!creditCard) return;
      
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const closingDay = creditCard.closingDay || 1;
      
      // Calcular período da fatura atual
      let invoiceStartDate: Date;
      let invoiceEndDate: Date;
      
      if (closingDay === 1) {
        invoiceStartDate = new Date(currentYear, currentMonth, 1);
        invoiceEndDate = new Date(currentYear, currentMonth + 1, 0);
      } else {
        invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
        invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);
      }
      
      // Buscar transações da fatura atual
      const transactions = await storage.getTransactions();
      const currentInvoiceTransactions = transactions.filter(t => 
        t.creditCardId === creditCardId && 
        t.type === 'expense' &&
        t.date >= invoiceStartDate.toISOString().split('T')[0] &&
        t.date <= invoiceEndDate.toISOString().split('T')[0]
      );
      
      // Calcular total apenas das transações reais
      const transactionsTotal = currentInvoiceTransactions.reduce((sum, t) => 
        sum + parseFloat(t.amount), 0
      );
      
      // Atualizar o cartão com apenas transações reais
      await storage.updateCreditCard(creditCardId, {
        currentUsed: transactionsTotal.toFixed(2)
      });
      
      console.log(`🔥 Limite recalculado para cartão ${creditCard.name}: R$ ${transactionsTotal.toFixed(2)}`);
      console.log(`   - Transações: R$ ${transactionsTotal.toFixed(2)}`);
    } catch (error) {
      console.error('Erro ao recalcular limite do cartão:', error);
    }
  };

  // Credit Cards
  app.get("/api/credit-cards", async (req, res) => {
    try {
      // ⚡️ EXECUTAR FECHAMENTO AUTOMÁTICO ANTES DE RETORNAR CARTÕES
      await autoCloseInvoices();
      
      // 🔥 NOVA LÓGICA: Usar sistema de limite inteligente para todos os cartões
      const creditCards = await storage.getCreditCards();
      const creditCardService = new CreditCardService(storage);
      
      // Calcular limite inteligente para cada cartão
      for (const card of creditCards) {
        try {
          await creditCardService.calculateSmartLimit(card.id);
        } catch (error) {
          console.error(`Erro ao calcular limite inteligente para cartão ${card.id}:`, error);
        }
      }
      
      // Buscar cartões atualizados
      const updatedCreditCards = await storage.getCreditCards();
      console.log('Credit cards found:', updatedCreditCards.length);
      console.log('Credit cards data:', updatedCreditCards);
      
      // Retornar no formato esperado pelo frontend
      res.json({ success: true, data: updatedCreditCards });
    } catch (error) {
      console.error('Error fetching credit cards:', error);
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

  // 🔥 NOVA ROTA: Obter limite inteligente de um cartão específico
  app.get("/api/credit-cards/:id/smart-limit", async (req, res) => {
    try {
      const { id } = req.params;
      
      const creditCard = await storage.getCreditCardById(id);
      if (!creditCard) {
        return res.status(404).json({ 
          success: false, 
          message: "Cartão de crédito não encontrado" 
        });
      }

      // Usar o serviço para calcular o limite inteligente
      const creditCardService = new CreditCardService(storage);
      const smartLimit = await creditCardService.calculateSmartLimit(id);
      
      res.json({
        success: true,
        data: {
          creditCard: {
            id: creditCard.id,
            name: creditCard.name,
            limit: creditCard.limit,
            currentUsed: smartLimit.currentUsed,
            availableLimit: smartLimit.availableLimit
          },
          invoice: {
            status: smartLimit.invoiceStatus,
            totalAmount: smartLimit.currentInvoiceAmount,
            paidAmount: smartLimit.paidAmount,
            remainingBalance: smartLimit.remainingBalance
          }
        }
      });
    } catch (error) {
      console.error('Erro ao calcular limite inteligente:', error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao calcular limite inteligente" 
      });
    }
  });

  // Rota para buscar transações de cartão de crédito por período
  app.get("/api/transactions/credit-card/:cardId/:startDate/:endDate", async (req, res) => {
    try {
      const { cardId, startDate, endDate } = req.params;
      
      // Buscar transações do cartão no período específico
      const transactions = await storage.getTransactions();
      console.log(`🔍 Total de transações no sistema: ${transactions.length}`);
      console.log(`🔍 Buscando transações para cartão ${cardId} de ${startDate} até ${endDate}`);
      
      // Debug: mostrar todas as transações do cartão
      const allCardTransactions = transactions.filter(t => t.creditCardId === cardId);
      console.log(`🔍 Todas as transações do cartão ${cardId}:`, allCardTransactions.map(t => `${t.description}: R$ ${t.amount} em ${t.date}`));
      
      const cardTransactions = transactions.filter(t => {
        // Debug: verificar cada transação
        const isCardMatch = t.creditCardId === cardId;
        const isDateInRange = t.date >= startDate && t.date <= endDate;
        
        console.log(`🔍 Transação ${t.description}: cartão=${isCardMatch}, período=${isDateInRange} (${t.date} >= ${startDate} && ${t.date} <= ${endDate})`);
        
        if (isCardMatch && !isDateInRange) {
          console.log(`❌ Transação ${t.description} (${t.date}) não está no período ${startDate} - ${endDate}`);
        }
        
        return isCardMatch && isDateInRange;
      });
      
      console.log(`Transações filtradas para o cartão: ${cardTransactions.length}`);
      
      console.log(`Transações encontradas: ${cardTransactions.length}`);
      cardTransactions.forEach(t => {
        console.log(`- ${t.description}: R$ ${t.amount} em ${t.date} (Parcela: ${t.installmentNumber}/${t.installments})`);
      });
      
             // Retornar apenas as transações reais do cartão (sem assinaturas automáticas)
      res.json(cardTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações do cartão:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota principal para buscar todas as transações (DEVE vir DEPOIS das rotas mais específicas)
  app.get("/api/transactions", async (req, res) => {
    try {
      console.log('Rota /api/transactions chamada');
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
      
      console.log('Transações encontradas:', transactions.length);
      console.log('Primeira transação:', transactions[0]);
      console.log('Retornando resposta com estrutura:', { success: true, data: transactions.length });
      
      res.json({ success: true, data: transactions });
    } catch (error) {
      console.error('Erro na rota /api/transactions:', error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Rota para buscar faturas de cartão de crédito
  app.get("/api/credit-card-invoices/:cardId/:dueDate", async (req, res) => {
    try {
      const { cardId, dueDate } = req.params;
      
      console.log(`Buscando fatura para cartão ${cardId} com vencimento ${dueDate}`);
      
      // Buscar ou criar fatura para a data específica
      let invoice = await storage.getCreditCardInvoiceByCardAndDate?.(cardId, dueDate);
      
      if (!invoice) {
        // CORREÇÃO: Criar nova fatura se não existir - SEMPRE com valores zerados
        invoice = await storage.createCreditCardInvoice?.({
          creditCardId: cardId,
          dueDate: dueDate,
          totalAmount: "0",
          paidAmount: "0", // SEMPRE ZERO
          status: "pending"
        });
        console.log('🔥 Nova fatura criada com valores zerados:', invoice);
        console.log('Nova fatura criada:', invoice);
      } else {
        console.log('Fatura existente encontrada:', invoice);
      }
      
      // CORREÇÃO: Recalcular o valor total da fatura baseado nas transações atuais
      // Isso garante que as faturas sejam sempre atualizadas
      const allTransactions = await storage.getTransactions();
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Buscar o cartão para obter o dia de fechamento
      const creditCard = await storage.getCreditCardById(cardId);
      if (creditCard) {
        const closingDay = creditCard.closingDay;
        
        // Calcular período da fatura
        let invoiceStartDate: string;
        let invoiceEndDate: string;
        
        if (closingDay === 1) {
          invoiceStartDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
          invoiceEndDate = new Date(currentYear, currentMonth, 31).toISOString().split('T')[0];
        } else {
          invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay).toISOString().split('T')[0];
          invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1).toISOString().split('T')[0];
        }
        
        // Buscar transações do período da fatura
        const invoiceTransactions = allTransactions.filter(t => {
          const isCardMatch = t.creditCardId === cardId;
          const isDateInRange = t.date >= invoiceStartDate && t.date <= invoiceEndDate;
          
          if (isCardMatch && !isDateInRange) {
            console.log(`Transação ${t.description} (${t.date}) não está no período ${invoiceStartDate} - ${invoiceEndDate}`);
          }
          
          return isCardMatch && isDateInRange;
        });
        
        // Calcular valor total da fatura
        const totalAmount = invoiceTransactions.reduce((sum, t) => 
          sum + parseFloat(t.amount), 0
        );
        
        console.log(`Transações da fatura: ${invoiceTransactions.length} (Total: R$ ${totalAmount.toFixed(2)})`);
        invoiceTransactions.forEach(t => {
          console.log(`- ${t.description}: R$ ${t.amount} em ${t.date}`);
        });
        
        // CORREÇÃO: Atualizar a fatura com o valor total recalculado E ZERAR pagamento se não há transações
        if (invoice) {
          const needsUpdate = Math.abs(parseFloat(invoice.totalAmount || "0") - totalAmount) > 0.01;
          const needsPaymentReset = totalAmount === 0 && parseFloat(invoice.paidAmount || "0") > 0;
          
          if (needsUpdate || needsPaymentReset) {
            console.log(`Atualizando fatura: Total R$ ${invoice.totalAmount} → R$ ${totalAmount.toFixed(2)}`);
            
            const updateData: any = {
              totalAmount: totalAmount.toFixed(2)
            };
            
            // CORREÇÃO: Se não há transações, ZERAR pagamento
            if (totalAmount === 0) {
              updateData.paidAmount = "0";
              console.log(`🔥 Nenhuma transação - zerando pagamento: R$ ${invoice.paidAmount} → R$ 0.00`);
            }
            
            invoice = await storage.updateCreditCardInvoice(invoice.id, updateData);
          }
        }
      }
      
      // CORREÇÃO: Garantir que a resposta sempre tenha valores corretos
      const responseInvoice = invoice || { totalAmount: "0", paidAmount: "0", status: "pending" };
      
      // CORREÇÃO: Se não há transações, forçar valores zerados
      if (parseFloat(responseInvoice.totalAmount || "0") === 0) {
        responseInvoice.paidAmount = "0";
        console.log(`🔥 Resposta corrigida: Total R$ 0, Pago R$ 0`);
      }
      
      res.json(responseInvoice);
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
      
      console.log('Fatura encontrada:', invoice);
      
      const currentPaidAmount = parseFloat(invoice.paidAmount || "0");
      const paymentAmount = parseFloat(amount || "0");
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const totalAmount = parseFloat(invoice.totalAmount || "0");
      
      console.log('Valores do pagamento:', {
        currentPaidAmount,
        paymentAmount,
        newPaidAmount,
        totalAmount
      });
      
      // CORREÇÃO: Lógica de status baseada no período de fechamento
      // Buscar o cartão primeiro para obter o dia de fechamento
      const creditCard = await storage.getCreditCardById(invoice.creditCardId);
      if (!creditCard) {
        return res.status(404).json({ error: "Cartão de crédito não encontrado" });
      }
      
      // Calcular se a fatura está fechada
      const today = new Date();
      const closingDay = creditCard.closingDay;
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Calcular data de fechamento da fatura atual
      let invoiceClosingDate: Date;
      if (closingDay === 1) {
        invoiceClosingDate = new Date(currentYear, currentMonth, 1);
      } else {
        invoiceClosingDate = new Date(currentYear, currentMonth, closingDay);
      }
      
      // LÓGICA CORRIGIDA: Status baseado no período de fechamento
      let newStatus = "pending";
      const isInvoiceClosed = today > invoiceClosingDate;
      
      if (!isInvoiceClosed) {
        // Fatura ainda em aberto - status sempre "pending"
        newStatus = "pending";
      } else {
        // Fatura já fechada - pode ter status baseado no pagamento
        if (newPaidAmount >= totalAmount && totalAmount > 0) {
          newStatus = "paid";
        } else if (newPaidAmount > 0) {
          newStatus = "partial";
        }
      }
      
      console.log(`Status calculado: ${newStatus} (Pago: R$ ${newPaidAmount}, Total: R$ ${totalAmount}, Fechada: ${isInvoiceClosed})`);
      
      // Atualizar a fatura
      const updatedInvoice = await storage.updateCreditCardInvoice(invoiceId, {
        paidAmount: newPaidAmount.toFixed(2),
        status: newStatus
      });
      
      // CORREÇÃO: Atualizar o limite usado do cartão após pagamento
      if (creditCard) {
        // Após pagamento, recalcular o limite usado baseado na nova fatura em aberto
        // Buscar transações da nova fatura em aberto
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const closingDay = creditCard.closingDay;
        
        // CORREÇÃO: Após pagamento, o limite usado deve ser ZERO (fatura quitada)
        // O limite será recalculado automaticamente quando novas transações forem feitas
        await storage.updateCreditCard(invoice.creditCardId, {
          currentUsed: "0.00"
        });
        
        console.log(`Limite do cartão zerado após pagamento da fatura`);
      }
      
      res.json({
        success: true,
        data: updatedInvoice,
        message: "Pagamento registrado com sucesso!"
      });
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

  // 🔥 ROTAS DE ASSINATURAS REMOVIDAS - AGORA EM subscription-routes.ts

  // 🔥 NOVAS ROTAS DE ASSINATURAS
  app.use("/api/subscriptions", subscriptionRoutes);

  // 🔥 ROTA DE INVOICE PARA TESTAR A FUNÇÃO CORRIGIDA
  app.get("/api/credit-cards/:creditCardId/invoice", async (req, res) => {
    try {
      const { creditCardId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate e endDate são obrigatórios" });
      }
      
      const creditCardService = new CreditCardService(storage);
      const invoice = await creditCardService.calculateInvoice(
        creditCardId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(invoice);
    } catch (error) {
      console.error("Erro ao calcular fatura:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
