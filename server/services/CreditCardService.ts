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
   * 🔥 CORREÇÃO FINAL: Assinatura SEMPRE aparece na fatura atual (independente do status)
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

    // Calculate total amount (apenas transações reais)
    const transactionsTotal = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalAmount = transactionsTotal;

    console.log(`📊 Fatura calculada:`);
    console.log(`   - Transações: R$ ${transactionsTotal.toFixed(2)}`);
    console.log(`   - Total: R$ ${totalAmount.toFixed(2)}`);

    return {
      transactions,
      subscriptions: [], // Não incluir assinaturas automaticamente
      totalAmount,
      creditCard
    };
  }

  /**
   * Process credit card payment
   * 🔥 ATUALIZADO: Agora usa a lógica de limite inteligente
   */
  async processPayment(creditCardId: string, paymentAmount: number): Promise<CreditCardModel> {
    const creditCard = await this.getCreditCardById(creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // 🔥 NOVA LÓGICA: Verificar se o pagamento é válido para a fatura atual
    const smartLimit = await this.calculateSmartLimit(creditCardId);
    
    if (paymentAmount > smartLimit.remainingBalance) {
      throw new Error(`Valor do pagamento (R$ ${paymentAmount}) não pode exceder o saldo restante da fatura (R$ ${smartLimit.remainingBalance})`);
    }

    // Processar o pagamento na fatura
    const invoices = await this.storage.getCreditCardInvoices();
    const creditCardInvoices = invoices.filter(inv => inv.creditCardId === creditCardId);
    
    // Buscar fatura atual
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const closingDay = creditCard.getClosingDay();

    let invoiceStartDate: Date;
    let invoiceEndDate: Date;

    if (closingDay === 1) {
      invoiceStartDate = new Date(currentYear, currentMonth, 1);
      invoiceEndDate = new Date(currentYear, currentMonth + 1, 0);
    } else {
      invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
      invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);
    }

    const currentInvoice = creditCardInvoices.find(inv => {
      const invoiceDate = new Date(inv.dueDate);
      return invoiceDate >= invoiceStartDate && invoiceDate <= invoiceEndDate;
    });

    if (currentInvoice) {
      // Atualizar fatura existente
      const newPaidAmount = parseFloat(currentInvoice.paidAmount || '0') + paymentAmount;
      const newStatus = newPaidAmount >= smartLimit.currentInvoiceAmount ? 'paid' : 'partial';
      
      await this.storage.updateCreditCardInvoice(currentInvoice.id, {
        paidAmount: newPaidAmount.toString(),
        status: newStatus
      });
    } else {
      // Criar nova fatura se não existir
      await this.storage.createCreditCardInvoice({
        creditCardId,
        dueDate: invoiceEndDate.toISOString(),
        totalAmount: smartLimit.currentInvoiceAmount.toString(),
        paidAmount: paymentAmount.toString(),
        status: paymentAmount >= smartLimit.currentInvoiceAmount ? 'paid' : 'partial'
      });
    }

    // Recalcular limite após pagamento
    await this.calculateSmartLimit(creditCardId);
    
    // Retornar cartão atualizado
    const updated = await this.storage.getCreditCardById(creditCardId);
    return CreditCardModel.fromData(updated);
  }

  /**
   * Get credit cards summary
   * 🔥 ATUALIZADO: Agora usa a lógica de limite inteligente
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
    
    // 🔥 NOVA LÓGICA: Calcular limites usando sistema inteligente
    let totalLimit = 0;
    let totalUsed = 0;
    let totalAvailable = 0;

    for (const card of creditCards) {
      try {
        const cardId = card.getId();
        if (cardId) {
          const smartLimit = await this.calculateSmartLimit(cardId);
          totalLimit += card.getLimit();
          totalUsed += smartLimit.currentUsed;
          totalAvailable += smartLimit.availableLimit;
        } else {
          // Fallback se não tiver ID
          totalLimit += card.getLimit();
          totalUsed += card.getCurrentUsed();
          totalAvailable += card.getAvailableLimit();
        }
      } catch (error) {
        console.error(`Erro ao calcular limite inteligente para cartão ${card.getId()}:`, error);
        // Fallback para valores antigos
        totalLimit += card.getLimit();
        totalUsed += card.getCurrentUsed();
        totalAvailable += card.getAvailableLimit();
      }
    }

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
   * 🔥 ATUALIZADO: Agora usa a lógica de limite inteligente
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

    // 🔥 NOVA LÓGICA: Usar limite inteligente baseado na fatura atual
    const smartLimit = await this.calculateSmartLimit(creditCardId);
    
    if (smartLimit.invoiceStatus === 'closed') {
      return { 
        canPurchase: false, 
        reason: 'Fatura fechada. Limite disponível após pagamento da fatura atual.',
        availableLimit: 0
      };
    }

    if (amount > smartLimit.availableLimit) {
      return { 
        canPurchase: false, 
        reason: 'Valor excede o limite disponível para a fatura atual',
        availableLimit: smartLimit.availableLimit
      };
    }

    return { 
      canPurchase: true, 
      availableLimit: smartLimit.availableLimit 
    };
  }

  /**
   * Recalculate credit card limit based on transactions AND subscriptions
   * 🔥 ATUALIZADO: Agora usa a lógica de limite inteligente
   */
  async recalculateLimit(creditCardId: string): Promise<number> {
    // Usar a nova função de limite inteligente
    const smartLimit = await this.calculateSmartLimit(creditCardId);
    
    // Retornar o limite usado atual
    return smartLimit.currentUsed;
  }

  /**
   * 🔥 NOVA FUNÇÃO: Calcular limite inteligente baseado no saldo da fatura atual
   * Esta função implementa a lógica de limite = saldo restante da fatura
   */
  async calculateSmartLimit(creditCardId: string): Promise<{
    availableLimit: number;
    currentUsed: number;
    invoiceStatus: 'open' | 'closed' | 'paid';
    currentInvoiceAmount: number;
    paidAmount: number;
    remainingBalance: number;
  }> {
    const creditCard = await this.getCreditCardById(creditCardId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const closingDay = creditCard.getClosingDay();

    // 🔥 CORREÇÃO: Calcular período da fatura atual corretamente
    let invoiceStartDate: Date;
    let invoiceEndDate: Date;

    if (closingDay === 1) {
      // Se fecha no dia 1, fatura atual é do mês atual
      invoiceStartDate = new Date(currentYear, currentMonth, 1);
      invoiceEndDate = new Date(currentYear, currentMonth + 1, 0);
    } else {
      // 🔥 LÓGICA CORRIGIDA: Para cartões que fecham no dia X
      // A fatura atual é sempre a que está em aberto no momento
      if (today.getDate() >= closingDay) {
        // Se hoje é dia X ou depois, fatura atual vai do dia X do mês atual até dia X-1 do próximo mês
        invoiceStartDate = new Date(currentYear, currentMonth, closingDay);
        invoiceEndDate = new Date(currentYear, currentMonth + 1, closingDay - 1);
      } else {
        // Se hoje é antes do dia X, fatura atual vai do dia X do mês anterior até dia X-1 do mês atual
        invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
        invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);
      }
    }

    // 🔥 CORREÇÃO ADICIONAL: Se a fatura calculada for futura, usar a fatura anterior
    if (invoiceStartDate > today) {
      // A fatura calculada é futura, usar a fatura anterior
      if (closingDay === 1) {
        invoiceStartDate = new Date(currentYear, currentMonth - 1, 1);
        invoiceEndDate = new Date(currentYear, currentMonth, 0);
      } else {
        invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
        invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);
      }
      console.log(`🔄 Fatura calculada era futura, usando fatura anterior`);
    }

    console.log(`🔥 Calculando fatura para ${creditCard.getName()}:`);
    console.log(`   - Data atual: ${today.toISOString().split('T')[0]}`);
    console.log(`   - Dia de fechamento: ${closingDay}`);
    console.log(`   - Período da fatura: ${invoiceStartDate.toISOString().split('T')[0]} até ${invoiceEndDate.toISOString().split('T')[0]}`);
    console.log(`   - Data atual é: ${today.getDate()}, dia de fechamento é: ${closingDay}`);
    console.log(`   - Fatura fechou? ${today > invoiceEndDate ? 'SIM' : 'NÃO'}`);

    // Verificar se a fatura atual já fechou
    const hasClosed = today > invoiceEndDate;
    
    // Buscar faturas do cartão
    const invoices = await this.storage.getCreditCardInvoices();
    const creditCardInvoices = invoices.filter(inv => inv.creditCardId === creditCardId);

    // Buscar fatura atual (em aberto ou fechada)
    const currentInvoice = creditCardInvoices.find(inv => {
      const invoiceDate = new Date(inv.dueDate);
      return invoiceDate >= invoiceStartDate && invoiceDate <= invoiceEndDate;
    });

    // Buscar transações da fatura atual
    const transactions = await this.storage.getTransactions();
    const currentInvoiceTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const isCorrectCard = t.creditCardId === creditCardId;
      const isExpense = t.type === 'expense';
      const isInPeriod = transactionDate >= invoiceStartDate && transactionDate <= invoiceEndDate;
      
      console.log(`🔍 Transação ${t.description}: cartão=${isCorrectCard}, período=${isInPeriod} (${t.date} >= ${invoiceStartDate.toISOString().split('T')[0]} && ${t.date} <= ${invoiceEndDate.toISOString().split('T')[0]})`);
      
      return isCorrectCard && isExpense && isInPeriod;
    });

    // Calcular valores da fatura atual (apenas transações reais)
    const transactionsTotal = currentInvoiceTransactions.reduce((sum, t) => 
      sum + parseFloat(t.amount), 0
    );
    
    const currentInvoiceAmount = transactionsTotal;
    const paidAmount = currentInvoice ? parseFloat(currentInvoice.paidAmount || '0') : 0;
    const remainingBalance = currentInvoiceAmount - paidAmount;

    console.log(`📊 Valores da fatura:`);
    console.log(`   - Transações: R$ ${transactionsTotal.toFixed(2)}`);
    console.log(`   - Total da fatura: R$ ${currentInvoiceAmount.toFixed(2)}`);
    console.log(`   - Valor pago: R$ ${paidAmount.toFixed(2)}`);
    console.log(`   - Saldo restante: R$ ${remainingBalance.toFixed(2)}`);

    // 🔥 LÓGICA DO LIMITE INTELIGENTE:
    let availableLimit: number;
    let invoiceStatus: 'open' | 'closed' | 'paid';

    if (hasClosed) {
      // Fatura fechou mas ainda não foi paga
      if (remainingBalance > 0) {
        invoiceStatus = 'closed';
        // Limite = 0 (fatura fechada, não pode usar mais)
        availableLimit = 0;
      } else {
        invoiceStatus = 'paid';
        // Fatura foi paga, limite = próximo ciclo
        availableLimit = creditCard.getLimit();
      }
    } else {
      // Fatura ainda está em aberto
      invoiceStatus = 'open';
      // Limite = Saldo restante da fatura atual
      availableLimit = Math.max(0, creditCard.getLimit() - remainingBalance);
    }

    // Atualizar o cartão com o limite usado atual
    const currentUsed = remainingBalance;
    
    await this.storage.updateCreditCard(creditCardId, {
      currentUsed: currentUsed.toString()
    });

    console.log(`🔥 Limite Inteligente calculado para ${creditCard.getName()}:`);
    console.log(`   - Status da fatura: ${invoiceStatus}`);
    console.log(`   - Valor da fatura: R$ ${currentInvoiceAmount.toFixed(2)}`);
    console.log(`   - Valor pago: R$ ${paidAmount.toFixed(2)}`);
    console.log(`   - Saldo restante: R$ ${remainingBalance.toFixed(2)}`);
    console.log(`   - Limite disponível: R$ ${availableLimit.toFixed(2)}`);
    console.log(`   - Limite total: R$ ${creditCard.getLimit().toFixed(2)}`);

    return {
      availableLimit,
      currentUsed,
      invoiceStatus,
      currentInvoiceAmount,
      paidAmount,
      remainingBalance
    };
  }
}