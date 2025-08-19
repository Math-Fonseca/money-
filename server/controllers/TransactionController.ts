import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { TransactionService } from '../services/TransactionService';
import { IStorage } from '../storage';

/**
 * Transaction Controller
 * Handles HTTP requests related to transactions
 */
export class TransactionController extends BaseController {
  private transactionService: TransactionService;

  constructor(storage: IStorage) {
    super();
    this.transactionService = new TransactionService(storage);
  }

  /**
   * Get all transactions with optional filtering
   */
  getAllTransactions = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_ALL_TRANSACTIONS', req);
    
    const { startDate, endDate } = this.getDateRangeParams(req);
    const categoryId = req.query.categoryId as string;

    let transactions;
    
    if (startDate && endDate) {
      transactions = await this.transactionService.getTransactionsByDateRange(startDate, endDate);
    } else if (categoryId) {
      transactions = await this.transactionService.getTransactionsByCategory(categoryId);
    } else {
      transactions = await this.transactionService.getAllTransactions();
    }

    this.sendSuccess(res, transactions.map(t => t.toJSON()));
  });

  /**
   * Create a new transaction
   */
  createTransaction = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('CREATE_TRANSACTION', req, req.body);
    
    const transaction = await this.transactionService.createTransaction(req.body);
    this.sendSuccess(res, transaction.toJSON(), 'Transação criada com sucesso', 201);
  });

  /**
   * Update an existing transaction
   */
  updateTransaction = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('UPDATE_TRANSACTION', req, req.body);
    
    const { id } = req.params;
    const transaction = await this.transactionService.updateTransaction(id, req.body);
    
    this.sendSuccess(res, transaction.toJSON(), 'Transação atualizada com sucesso');
  });

  /**
   * Delete a transaction
   */
  deleteTransaction = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('DELETE_TRANSACTION', req);
    
    const { id } = req.params;
    await this.transactionService.deleteTransaction(id);
    
    res.status(204).send();
  });

  /**
   * Delete all recurring transactions
   */
  deleteRecurringTransactions = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('DELETE_RECURRING_TRANSACTIONS', req);
    
    const { parentId } = req.params;
    await this.transactionService.deleteRecurringTransactions(parentId);
    
    res.status(204).send();
  });

  /**
   * Delete all installment transactions
   */
  deleteInstallmentTransactions = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('DELETE_INSTALLMENT_TRANSACTIONS', req);
    
    const { parentId } = req.params;
    await this.transactionService.deleteInstallmentTransactions(parentId);
    
    res.status(204).send();
  });

  /**
   * Update all installment transactions
   */
  updateInstallmentTransactions = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('UPDATE_INSTALLMENT_TRANSACTIONS', req, req.body);
    
    const { parentId } = req.params;
    
    // This would need to be implemented in the service
    // For now, return a not implemented error
    this.sendError(res, 'Funcionalidade ainda não implementada', 501);
  });

  /**
   * Get transaction statistics
   */
  getTransactionStatistics = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_TRANSACTION_STATISTICS', req);
    
    const { startDate, endDate } = this.getDateRangeParams(req);
    
    if (!startDate || !endDate) {
      this.sendError(res, 'Data de início e fim são obrigatórias', 400);
      return;
    }

    const transactions = await this.transactionService.getTransactionsByDateRange(startDate, endDate);
    
    // Calculate statistics
    const totalIncome = transactions
      .filter(t => t.getType() === 'income')
      .reduce((sum, t) => sum + t.getAmount(), 0);
      
    const totalExpenses = transactions
      .filter(t => t.getType() === 'expense')
      .reduce((sum, t) => sum + t.getAmount(), 0);
      
    const balance = totalIncome - totalExpenses;
    
    const statistics = {
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: transactions.length,
      incomeTransactions: transactions.filter(t => t.getType() === 'income').length,
      expenseTransactions: transactions.filter(t => t.getType() === 'expense').length,
      period: { startDate, endDate }
    };

    this.sendSuccess(res, statistics);
  });

  /**
   * Get transactions by payment method
   */
  getTransactionsByPaymentMethod = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_TRANSACTIONS_BY_PAYMENT_METHOD', req);
    
    const { paymentMethod } = req.params;
    const { startDate, endDate } = this.getDateRangeParams(req);
    
    let transactions = await this.transactionService.getAllTransactions();
    
    // Filter by payment method
    transactions = transactions.filter(t => t.getPaymentMethod() === paymentMethod);
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      transactions = transactions.filter(t => {
        const transactionDate = t.getDate();
        return transactionDate >= start && transactionDate <= end;
      });
    }

    this.sendSuccess(res, transactions.map(t => t.toJSON()));
  });

  /**
   * Get recurring transactions
   */
  getRecurringTransactions = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_RECURRING_TRANSACTIONS', req);
    
    const transactions = await this.transactionService.getAllTransactions();
    const recurringTransactions = transactions.filter(t => t.getIsRecurring());

    this.sendSuccess(res, recurringTransactions.map(t => t.toJSON()));
  });

  /**
   * Get installment transactions
   */
  getInstallmentTransactions = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_INSTALLMENT_TRANSACTIONS', req);
    
    const transactions = await this.transactionService.getAllTransactions();
    const installmentTransactions = transactions.filter(t => t.isInstallmentTransaction());

    this.sendSuccess(res, installmentTransactions.map(t => t.toJSON()));
  });
}