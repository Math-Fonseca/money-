import { BaseModel } from './BaseModel';
import { z } from 'zod';

/**
 * Transaction Model
 * Represents a financial transaction with validation and business logic
 */
export class TransactionModel extends BaseModel {
  private description: string;
  private amount: number;
  private date: Date;
  private type: 'income' | 'expense';
  private categoryId: string;
  private paymentMethod: string;
  private creditCardId?: string;
  private installments?: number;
  private installmentNumber?: number;
  private parentTransactionId?: string;
  private isRecurring?: boolean;

  // Validation schema
  private static validationSchema = z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.number().positive('Valor deve ser positivo'),
    date: z.date(),
    type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo deve ser receita ou despesa' }) }),
    categoryId: z.string().min(1, 'Categoria é obrigatória'),
    paymentMethod: z.string().min(1, 'Método de pagamento é obrigatório'),
    creditCardId: z.string().optional(),
    installments: z.number().positive().optional(),
    installmentNumber: z.number().positive().optional(),
    parentTransactionId: z.string().optional(),
    isRecurring: z.boolean().optional()
  });

  constructor(data: any = {}) {
    super(data);
    this.description = data.description || '';
    this.amount = parseFloat(data.amount) || 0;
    this.date = data.date ? new Date(data.date) : new Date();
    this.type = data.type || 'expense';
    this.categoryId = data.categoryId || '';
    this.paymentMethod = data.paymentMethod || '';
    this.creditCardId = data.creditCardId;
    this.installments = data.installments;
    this.installmentNumber = data.installmentNumber;
    this.parentTransactionId = data.parentTransactionId;
    this.isRecurring = data.isRecurring || false;
  }

  // Getters
  getDescription(): string { return this.description; }
  getAmount(): number { return this.amount; }
  getDate(): Date { return this.date; }
  getType(): 'income' | 'expense' { return this.type; }
  getCategoryId(): string { return this.categoryId; }
  getPaymentMethod(): string { return this.paymentMethod; }
  getCreditCardId(): string | undefined { return this.creditCardId; }
  getInstallments(): number | undefined { return this.installments; }
  getInstallmentNumber(): number | undefined { return this.installmentNumber; }
  getParentTransactionId(): string | undefined { return this.parentTransactionId; }
  getIsRecurring(): boolean { return this.isRecurring || false; }

  // Setters
  setDescription(description: string): void { this.description = description; this.touch(); }
  setAmount(amount: number): void { this.amount = amount; this.touch(); }
  setDate(date: Date): void { this.date = date; this.touch(); }
  setType(type: 'income' | 'expense'): void { this.type = type; this.touch(); }
  setCategoryId(categoryId: string): void { this.categoryId = categoryId; this.touch(); }
  setPaymentMethod(paymentMethod: string): void { this.paymentMethod = paymentMethod; this.touch(); }
  setCreditCardId(creditCardId: string | undefined): void { this.creditCardId = creditCardId; this.touch(); }
  setInstallments(installments: number | undefined): void { this.installments = installments; this.touch(); }
  setInstallmentNumber(installmentNumber: number | undefined): void { this.installmentNumber = installmentNumber; this.touch(); }
  setParentTransactionId(parentTransactionId: string | undefined): void { this.parentTransactionId = parentTransactionId; this.touch(); }
  setIsRecurring(isRecurring: boolean): void { this.isRecurring = isRecurring; this.touch(); }

  /**
   * Check if transaction is an installment
   */
  isInstallmentTransaction(): boolean {
    return !!(this.installments && this.installments > 1);
  }

  /**
   * Check if transaction is a parent installment
   */
  isParentInstallment(): boolean {
    return this.isInstallmentTransaction() && this.installmentNumber === 1;
  }

  /**
   * Check if transaction is a child installment
   */
  isChildInstallment(): boolean {
    return !!(this.parentTransactionId && this.installmentNumber && this.installmentNumber > 1);
  }

  /**
   * Get formatted amount as currency
   */
  getFormattedAmount(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.amount);
  }

  /**
   * Get formatted date
   */
  getFormattedDate(): string {
    return this.date.toLocaleDateString('pt-BR');
  }

  /**
   * Calculate monthly installment amount
   */
  getInstallmentAmount(): number {
    if (!this.installments || this.installments <= 1) {
      return this.amount;
    }
    return this.amount / this.installments;
  }

  /**
   * Validate transaction data
   */
  validate(): { isValid: boolean; errors: string[] } {
    try {
      TransactionModel.validationSchema.parse({
        description: this.description,
        amount: this.amount,
        date: this.date,
        type: this.type,
        categoryId: this.categoryId,
        paymentMethod: this.paymentMethod,
        creditCardId: this.creditCardId,
        installments: this.installments,
        installmentNumber: this.installmentNumber,
        parentTransactionId: this.parentTransactionId,
        isRecurring: this.isRecurring
      });

      // Additional business logic validation
      const errors: string[] = [];

      if (this.type === 'expense' && this.paymentMethod === 'credito' && !this.creditCardId) {
        errors.push('Cartão de crédito é obrigatório para pagamentos no crédito');
      }

      if (this.installments && this.installments > 1 && !this.creditCardId) {
        errors.push('Parcelamento só é permitido para cartão de crédito');
      }

      if (this.installmentNumber && (!this.installments || this.installmentNumber > this.installments)) {
        errors.push('Número da parcela inválido');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => e.message)
        };
      }
      return {
        isValid: false,
        errors: ['Erro de validação desconhecido']
      };
    }
  }

  /**
   * Convert to database format
   */
  toData(): Record<string, any> {
    return {
      description: this.description,
      amount: this.amount.toString(),
      date: this.date.toISOString().split('T')[0],
      type: this.type,
      categoryId: this.categoryId,
      paymentMethod: this.paymentMethod,
      creditCardId: this.creditCardId,
      installments: this.installments,
      installmentNumber: this.installmentNumber,
      parentTransactionId: this.parentTransactionId,
      isRecurring: this.isRecurring
    };
  }

  /**
   * Create from database data
   */
  static fromData(data: any): TransactionModel {
    return new TransactionModel({
      ...data,
      amount: parseFloat(data.amount),
      date: new Date(data.date)
    });
  }
}