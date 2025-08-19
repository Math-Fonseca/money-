import { TransactionModel } from '../models/TransactionModel';
import { CreditCardModel } from '../models/CreditCardModel';
import { IStorage } from '../storage';

/**
 * Transaction Service
 * Handles business logic for transactions including installments and credit card integration
 */
export class TransactionService {
  constructor(private storage: IStorage) {}

  /**
   * Create a new transaction with business logic validation
   */
  async createTransaction(transactionData: any): Promise<TransactionModel> {
    const transaction = new TransactionModel(transactionData);
    
    // Validate transaction
    const validation = transaction.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Handle credit card transactions
    if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
      await this.validateCreditCardTransaction(transaction);
    }

    // Handle installment transactions
    if (transaction.isInstallmentTransaction()) {
      return await this.createInstallmentTransactions(transaction);
    }

    // Create single transaction
    const created = await this.storage.createTransaction(transaction.toData() as any);
    
    // Update credit card limit if applicable
    if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
      await this.updateCreditCardLimit(transaction.getCreditCardId()!, transaction.getAmount());
    }

    return TransactionModel.fromData(created);
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(id: string, updateData: any): Promise<TransactionModel> {
    const existingTransaction = await this.storage.getTransactionById(id);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    const originalTransaction = TransactionModel.fromData(existingTransaction);
    const updatedTransaction = new TransactionModel({ ...existingTransaction, ...updateData });

    // Validate updated transaction
    const validation = updatedTransaction.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Handle credit card limit adjustments
    if (originalTransaction.getCreditCardId() && originalTransaction.getType() === 'expense') {
      const originalAmount = originalTransaction.getAmount();
      const newAmount = updatedTransaction.getAmount();
      const difference = newAmount - originalAmount;

      if (difference !== 0) {
        await this.updateCreditCardLimit(originalTransaction.getCreditCardId()!, difference);
      }
    }

    const updated = await this.storage.updateTransaction(id, updatedTransaction.toData());
    return TransactionModel.fromData(updated);
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<boolean> {
    const existingTransaction = await this.storage.getTransactionById(id);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    const transaction = TransactionModel.fromData(existingTransaction);

    // Handle credit card limit adjustment
    if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
      await this.updateCreditCardLimit(transaction.getCreditCardId()!, -transaction.getAmount());
    }

    return await this.storage.deleteTransaction(id);
  }

  /**
   * Delete all recurring transactions
   */
  async deleteRecurringTransactions(parentId: string): Promise<boolean> {
    // Get all recurring transactions
    const transactions = await this.storage.getTransactions();
    const recurringTransactions = transactions.filter(t => 
      t.parentTransactionId === parentId || t.id === parentId
    );

    // Adjust credit card limits for each transaction
    for (const transactionData of recurringTransactions) {
      const transaction = TransactionModel.fromData(transactionData);
      if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
        await this.updateCreditCardLimit(transaction.getCreditCardId()!, -transaction.getAmount());
      }
    }

    return await this.storage.deleteRecurringTransactions(parentId);
  }

  /**
   * Delete all installment transactions
   */
  async deleteInstallmentTransactions(parentId: string): Promise<boolean> {
    // Get all installment transactions
    const transactions = await this.storage.getTransactions();
    const installmentTransactions = transactions.filter(t => 
      t.parentTransactionId === parentId || t.id === parentId
    );

    // Calculate total amount to subtract from credit card
    let totalAmount = 0;
    let creditCardId: string | null = null;

    for (const transactionData of installmentTransactions) {
      const transaction = TransactionModel.fromData(transactionData);
      if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
        totalAmount += transaction.getAmount();
        creditCardId = transaction.getCreditCardId()!;
      }
    }

    // Adjust credit card limit once for the total amount
    if (creditCardId && totalAmount > 0) {
      await this.updateCreditCardLimit(creditCardId, -totalAmount);
    }

    return await this.storage.deleteInstallmentTransactions(parentId);
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<TransactionModel[]> {
    const transactions = await this.storage.getTransactionsByDateRange(startDate, endDate);
    return transactions.map(t => TransactionModel.fromData(t));
  }

  /**
   * Get transactions by category
   */
  async getTransactionsByCategory(categoryId: string): Promise<TransactionModel[]> {
    const transactions = await this.storage.getTransactionsByCategory(categoryId);
    return transactions.map(t => TransactionModel.fromData(t));
  }

  /**
   * Get all transactions
   */
  async getAllTransactions(): Promise<TransactionModel[]> {
    const transactions = await this.storage.getTransactions();
    return transactions.map(t => TransactionModel.fromData(t));
  }

  /**
   * Validate credit card transaction
   */
  private async validateCreditCardTransaction(transaction: TransactionModel): Promise<void> {
    const creditCardData = await this.storage.getCreditCardById(transaction.getCreditCardId()!);
    if (!creditCardData) {
      throw new Error('Credit card not found');
    }

    const creditCard = CreditCardModel.fromData(creditCardData);
    
    if (!creditCard.canAccommodatePurchase(transaction.getAmount())) {
      const availableLimit = creditCard.getAvailableLimit();
      throw new Error(
        `Limite do cartão insuficiente. Limite disponível: ${creditCard.getFormattedAvailableLimit()}. ` +
        `Valor da transação: ${transaction.getFormattedAmount()}`
      );
    }
  }

  /**
   * Create installment transactions
   */
  private async createInstallmentTransactions(parentTransaction: TransactionModel): Promise<TransactionModel> {
    const installments = parentTransaction.getInstallments()!;
    const installmentAmount = parentTransaction.getInstallmentAmount();

    // Create parent transaction (first installment)
    parentTransaction.setInstallmentNumber(1);
    parentTransaction.setAmount(installmentAmount);
    
    const createdParent = await this.storage.createTransaction(parentTransaction.toData() as any);
    
    // Create subsequent installments
    const promises: Promise<any>[] = [];
    
    for (let i = 2; i <= installments; i++) {
      const installmentDate = new Date(parentTransaction.getDate());
      installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
      
      const installmentTransaction = new TransactionModel({
        ...parentTransaction.toData(),
        amount: installmentAmount,
        date: installmentDate.toISOString().split('T')[0],
        installmentNumber: i,
        parentTransactionId: createdParent.id,
      });
      
      promises.push(this.storage.createTransaction(installmentTransaction.toData() as any));
    }
    
    await Promise.all(promises);

    // Update credit card limit with total amount (not just first installment)
    if (parentTransaction.getCreditCardId()) {
      const totalAmount = parentTransaction.getAmount() * installments;
      await this.updateCreditCardLimit(parentTransaction.getCreditCardId()!, totalAmount);
    }

    return TransactionModel.fromData(createdParent);
  }

  /**
   * Update credit card limit
   */
  private async updateCreditCardLimit(creditCardId: string, amountChange: number): Promise<void> {
    const creditCardData = await this.storage.getCreditCardById(creditCardId);
    if (!creditCardData) {
      throw new Error('Credit card not found');
    }

    const creditCard = CreditCardModel.fromData(creditCardData);
    const newCurrentUsed = Math.max(0, creditCard.getCurrentUsed() + amountChange);
    
    await this.storage.updateCreditCard(creditCardId, {
      currentUsed: newCurrentUsed.toString()
    });
  }
}