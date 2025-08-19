import { CreditCardModel } from '../models/CreditCardModel';
import { IStorage } from '../storage';

/**
 * Credit Card Service
 * Handles business logic for credit cards including limit management and invoice calculations
 */
export class CreditCardService {
  constructor(private storage: IStorage) {}

  /**
   * Create a new credit card
   */
  async createCreditCard(creditCardData: any): Promise<CreditCardModel> {
    const creditCard = new CreditCardModel(creditCardData);
    
    // Validate credit card
    const validation = creditCard.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const created = await this.storage.createCreditCard(creditCard.toData() as any);
    return CreditCardModel.fromData(created);
  }

  /**
   * Update an existing credit card
   */
  async updateCreditCard(id: string, updateData: any): Promise<CreditCardModel> {
    const existingCreditCard = await this.storage.getCreditCardById(id);
    if (!existingCreditCard) {
      throw new Error('Credit card not found');
    }

    const updatedCreditCard = new CreditCardModel({ ...existingCreditCard, ...updateData });

    // Validate updated credit card
    const validation = updatedCreditCard.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await this.storage.updateCreditCard(id, updatedCreditCard.toData());
    return CreditCardModel.fromData(updated);
  }

  /**
   * Delete a credit card
   */
  async deleteCreditCard(id: string): Promise<boolean> {
    const existingCreditCard = await this.storage.getCreditCardById(id);
    if (!existingCreditCard) {
      throw new Error('Credit card not found');
    }

    // Check if credit card has associated transactions
    const transactions = await this.storage.getTransactions();
    const hasTransactions = transactions.some(t => t.creditCardId === id);
    
    if (hasTransactions) {
      throw new Error('Cannot delete credit card with associated transactions');
    }

    return await this.storage.deleteCreditCard(id);
  }

  /**
   * Get credit card by ID
   */
  async getCreditCardById(id: string): Promise<CreditCardModel | null> {
    const creditCardData = await this.storage.getCreditCardById(id);
    if (!creditCardData) {
      return null;
    }
    return CreditCardModel.fromData(creditCardData);
  }

  /**
   * Get all credit cards
   */
  async getAllCreditCards(): Promise<CreditCardModel[]> {
    const creditCards = await this.storage.getCreditCards();
    return creditCards.map(cc => CreditCardModel.fromData(cc));
  }

  /**
   * Get active credit cards only
   */
  async getActiveCreditCards(): Promise<CreditCardModel[]> {
    const creditCards = await this.getAllCreditCards();
    return creditCards.filter(cc => cc.getIsActive() && !cc.getIsBlocked());
  }

  /**
   * Block/unblock a credit card
   */
  async toggleCreditCardBlock(id: string, isBlocked: boolean): Promise<CreditCardModel> {
    const creditCard = await this.getCreditCardById(id);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    creditCard.setIsBlocked(isBlocked);
    const updated = await this.storage.updateCreditCard(id, creditCard.toData());
    return CreditCardModel.fromData(updated);
  }

  /**
   * Activate/deactivate a credit card
   */
  async toggleCreditCardActive(id: string, isActive: boolean): Promise<CreditCardModel> {
    const creditCard = await this.getCreditCardById(id);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    creditCard.setIsActive(isActive);
    const updated = await this.storage.updateCreditCard(id, creditCard.toData());
    return CreditCardModel.fromData(updated);
  }

  /**
   * Calculate invoice for a credit card in a specific period
   */
  async calculateInvoice(creditCardId: string, startDate: Date, endDate: Date): Promise<{
    transactions: any[];
    subscriptions: any[];
    totalAmount: number;
    creditCard: CreditCardModel;
  }> {
    const creditCard = await this.getCreditCardById(creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Get transactions for the period
    const allTransactions = await this.storage.getTransactionsByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const transactions = allTransactions.filter(t => 
      t.creditCardId === creditCardId && t.type === 'expense'
    );

    // Get active subscriptions for this credit card
    const allSubscriptions = await this.storage.getSubscriptions();
    const subscriptions = allSubscriptions.filter(s => 
      s.creditCardId === creditCardId && 
      s.paymentMethod === 'credito' &&
      s.isActive
    );

    // Calculate total amount
    const transactionsTotal = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const subscriptionsTotal = subscriptions.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const totalAmount = transactionsTotal + subscriptionsTotal;

    return {
      transactions,
      subscriptions,
      totalAmount,
      creditCard
    };
  }

  /**
   * Process credit card payment
   */
  async processPayment(creditCardId: string, paymentAmount: number): Promise<CreditCardModel> {
    const creditCard = await this.getCreditCardById(creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (paymentAmount > creditCard.getCurrentUsed()) {
      throw new Error('Payment amount cannot exceed current used amount');
    }

    // Subtract payment from current used amount
    creditCard.subtractFromUsedAmount(paymentAmount);
    
    const updated = await this.storage.updateCreditCard(creditCardId, creditCard.toData());
    return CreditCardModel.fromData(updated);
  }

  /**
   * Get credit cards summary
   */
  async getCreditCardsSummary(): Promise<{
    totalCards: number;
    activeCards: number;
    blockedCards: number;
    totalLimit: number;
    totalUsed: number;
    totalAvailable: number;
    usagePercentage: number;
  }> {
    const creditCards = await this.getAllCreditCards();
    
    const activeCards = creditCards.filter(cc => cc.getIsActive()).length;
    const blockedCards = creditCards.filter(cc => cc.getIsBlocked()).length;
    
    const totalLimit = creditCards.reduce((sum, cc) => sum + cc.getLimit(), 0);
    const totalUsed = creditCards.reduce((sum, cc) => sum + cc.getCurrentUsed(), 0);
    const totalAvailable = totalLimit - totalUsed;
    const usagePercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    return {
      totalCards: creditCards.length,
      activeCards,
      blockedCards,
      totalLimit,
      totalUsed,
      totalAvailable,
      usagePercentage
    };
  }

  /**
   * Validate if a purchase can be made with a credit card
   */
  async validatePurchase(creditCardId: string, amount: number): Promise<{
    canPurchase: boolean;
    reason?: string;
    availableLimit?: number;
  }> {
    const creditCard = await this.getCreditCardById(creditCardId);
    if (!creditCard) {
      return { canPurchase: false, reason: 'Credit card not found' };
    }

    if (creditCard.getIsBlocked()) {
      return { canPurchase: false, reason: 'Credit card is blocked' };
    }

    if (!creditCard.getIsActive()) {
      return { canPurchase: false, reason: 'Credit card is inactive' };
    }

    if (!creditCard.canAccommodatePurchase(amount)) {
      return { 
        canPurchase: false, 
        reason: 'Insufficient credit limit',
        availableLimit: creditCard.getAvailableLimit()
      };
    }

    return { canPurchase: true, availableLimit: creditCard.getAvailableLimit() };
  }

  /**
   * Recalculate credit card limit based on transactions AND subscriptions
   */
  async recalculateLimit(creditCardId: string): Promise<number> {
    const transactions = await this.storage.getTransactions();
    const creditCardTransactions = transactions.filter((t: any) => 
      t.creditCardId === creditCardId && t.type === 'expense'
    );

    // ⚡️ INCLUIR ASSINATURAS ATIVAS NO CÁLCULO DO LIMITE
    const subscriptions = await this.storage.getActiveSubscriptions();
    const creditCardSubscriptions = subscriptions.filter(s => 
      s.creditCardId === creditCardId && s.paymentMethod === 'credito' && s.isActive
    );

    const transactionTotal = creditCardTransactions.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount), 0
    );

    const subscriptionTotal = creditCardSubscriptions.reduce((sum: number, s: any) => 
      sum + parseFloat(s.amount), 0
    );

    const totalUsed = transactionTotal + subscriptionTotal;

    await this.storage.updateCreditCard(creditCardId, {
      currentUsed: totalUsed.toString()
    });

    return totalUsed;
  }
}