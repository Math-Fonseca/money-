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
    // Pre-process the data to handle null values
    const processedData = {
      ...transactionData,
      creditCardId: transactionData.creditCardId === null ? undefined : transactionData.creditCardId,
      installments: transactionData.installments === null ? undefined : transactionData.installments,
      installmentNumber: transactionData.installmentNumber === null ? undefined : transactionData.installmentNumber,
      parentTransactionId: transactionData.parentTransactionId === null ? undefined : transactionData.parentTransactionId
    };
    
    const transaction = new TransactionModel(processedData);
    
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

    // Update credit card limit if applicable (before creating)
    if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
      await this.updateCreditCardLimit(transaction.getCreditCardId()!, transaction.getAmount());
    }

    // Create single transaction
    const created = await this.storage.createTransaction(transaction.toData() as any);

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
   * Delete a transaction with proper credit limit recalculation
   */
  async deleteTransaction(id: string): Promise<boolean> {
    const existingTransaction = await this.storage.getTransactionById(id);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    const transaction = TransactionModel.fromData(existingTransaction);
    let affectedCardId: string | null = null;

    // Track affected credit card
    if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
      affectedCardId = transaction.getCreditCardId()!;
    }

    // Delete transaction first
    const result = await this.storage.deleteTransaction(id);

    // Recalculate limit for affected credit card to ensure accuracy
    if (affectedCardId) {
      const { CreditCardService } = await import('./CreditCardService');
      const creditCardService = new CreditCardService(this.storage);
      await creditCardService.recalculateLimit(affectedCardId);
    }

    return result;
  }

  /**
   * Delete all recurring transactions with proper credit limit handling
   */
  async deleteRecurringTransactions(parentId: string): Promise<boolean> {
    // Get all recurring transactions
    const transactions = await this.storage.getTransactions();
    const recurringTransactions = transactions.filter(t => 
      t.parentTransactionId === parentId || t.id === parentId
    );

    // Track credit card impact per card
    const creditCardImpacts = new Map<string, number>();

    for (const transactionData of recurringTransactions) {
      const transaction = TransactionModel.fromData(transactionData);
      if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
        const cardId = transaction.getCreditCardId()!;
        const currentImpact = creditCardImpacts.get(cardId) || 0;
        creditCardImpacts.set(cardId, currentImpact + transaction.getAmount());
      }
    }

    // Delete transactions first
    const result = await this.storage.deleteRecurringTransactions(parentId);

    // Recalculate limits for affected credit cards to ensure accuracy
    for (const [cardId] of creditCardImpacts) {
      const { CreditCardService } = await import('./CreditCardService');
      const creditCardService = new CreditCardService(this.storage);
      await creditCardService.recalculateLimit(cardId);
    }

    return result;
  }

  /**
   * Delete all installment transactions with proper credit limit recalculation
   */
  async deleteInstallmentTransactions(parentId: string): Promise<boolean> {
    // Get all installment transactions
    const transactions = await this.storage.getTransactions();
    const installmentTransactions = transactions.filter(t => 
      t.parentTransactionId === parentId || t.id === parentId
    );

    // Track affected credit cards
    const affectedCreditCards = new Set<string>();

    for (const transactionData of installmentTransactions) {
      const transaction = TransactionModel.fromData(transactionData);
      if (transaction.getCreditCardId() && transaction.getType() === 'expense') {
        affectedCreditCards.add(transaction.getCreditCardId()!);
      }
    }

    // Delete installment transactions first
    const result = await this.storage.deleteInstallmentTransactions(parentId);

    // Recalculate limits for affected credit cards to ensure accuracy
    for (const cardId of affectedCreditCards) {
      const { CreditCardService } = await import('./CreditCardService');
      const creditCardService = new CreditCardService(this.storage);
      await creditCardService.recalculateLimit(cardId);
    }

    return result;
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

    // ⚡️ DEFINIR isInstallment = true para parcelas de cartão de crédito
    const parentData = parentTransaction.toData() as any;
    if (parentTransaction.getPaymentMethod() === 'credito') {
      parentData.isInstallment = true;
    }

    // Create parent transaction (first installment)
    parentTransaction.setInstallmentNumber(1);
    parentTransaction.setAmount(installmentAmount);
    
    const createdParent = await this.storage.createTransaction(parentData);
    
    // Create subsequent installments first
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
        isInstallment: parentTransaction.getPaymentMethod() === 'credito', // ⚡️ DEFINIR para todas as parcelas
      });
      
      promises.push(this.storage.createTransaction(installmentTransaction.toData() as any));
    }
    
    await Promise.all(promises);

    // Update credit card limit with total installment amount (all installments at once)
    if (parentTransaction.getCreditCardId()) {
      const totalAmount = installmentAmount * installments;
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

  /**
   * Recalculate credit card limit based on existing transactions
   */
  async recalculateCreditCardLimit(creditCardId: string): Promise<void> {
    const transactions = await this.storage.getTransactions();
    const creditCardTransactions = transactions.filter(t => 
      t.creditCardId === creditCardId && t.type === 'expense'
    );

    const totalUsed = creditCardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    await this.storage.updateCreditCard(creditCardId, {
      currentUsed: totalUsed.toString()
    });
  }
}