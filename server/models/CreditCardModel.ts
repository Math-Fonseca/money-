import { BaseModel } from './BaseModel';
import { z } from 'zod';

/**
 * Credit Card Model
 * Represents a credit card with validation and business logic
 */
export class CreditCardModel extends BaseModel {
  private name: string;
  private brand: string;
  private bank: string;
  private limit: number;
  private currentUsed: number;
  private closingDay: number;
  private dueDay: number;
  private color: string;
  private isActive: boolean;
  private isBlocked: boolean;

  // Validation schema
  private static validationSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    brand: z.string().min(1, 'Bandeira é obrigatória'),
    bank: z.string().min(1, 'Banco é obrigatório'),
    limit: z.number().positive('Limite deve ser positivo'),
    currentUsed: z.number().min(0, 'Valor usado não pode ser negativo'),
    closingDay: z.number().min(1).max(31, 'Dia de fechamento deve estar entre 1 e 31'),
    dueDay: z.number().min(1).max(31, 'Dia de vencimento deve estar entre 1 e 31'),
    color: z.string().min(1, 'Cor é obrigatória'),
    isActive: z.boolean(),
    isBlocked: z.boolean()
  });

  constructor(data: any = {}) {
    super(data);
    this.name = data.name || '';
    this.brand = data.brand || '';
    this.bank = data.bank || '';
    this.limit = parseFloat(data.limit) || 0;
    this.currentUsed = parseFloat(data.currentUsed) || 0;
    this.closingDay = data.closingDay || 1;
    this.dueDay = data.dueDay || 10;
    this.color = data.color || '#3B82F6';
    this.isActive = data.isActive !== false;
    this.isBlocked = data.isBlocked || false;
  }

  // Getters
  getName(): string { return this.name; }
  getBrand(): string { return this.brand; }
  getBank(): string { return this.bank; }
  getLimit(): number { return this.limit; }
  getCurrentUsed(): number { return this.currentUsed; }
  getClosingDay(): number { return this.closingDay; }
  getDueDay(): number { return this.dueDay; }
  getColor(): string { return this.color; }
  getIsActive(): boolean { return this.isActive; }
  getIsBlocked(): boolean { return this.isBlocked; }

  // Setters
  setName(name: string): void { this.name = name; this.touch(); }
  setBrand(brand: string): void { this.brand = brand; this.touch(); }
  setBank(bank: string): void { this.bank = bank; this.touch(); }
  setLimit(limit: number): void { this.limit = limit; this.touch(); }
  setCurrentUsed(currentUsed: number): void { this.currentUsed = Math.max(0, currentUsed); this.touch(); }
  setClosingDay(closingDay: number): void { this.closingDay = closingDay; this.touch(); }
  setDueDay(dueDay: number): void { this.dueDay = dueDay; this.touch(); }
  setColor(color: string): void { this.color = color; this.touch(); }
  setIsActive(isActive: boolean): void { this.isActive = isActive; this.touch(); }
  setIsBlocked(isBlocked: boolean): void { this.isBlocked = isBlocked; this.touch(); }

  /**
   * Get available limit
   */
  getAvailableLimit(): number {
    return Math.max(0, this.limit - this.currentUsed);
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(): number {
    if (this.limit <= 0) return 0;
    return Math.min(100, (this.currentUsed / this.limit) * 100);
  }

  /**
   * Check if card can accommodate a purchase
   */
  canAccommodatePurchase(amount: number): boolean {
    if (this.isBlocked || !this.isActive) return false;
    return this.getAvailableLimit() >= amount;
  }

  /**
   * Add to current used amount
   */
  addToUsedAmount(amount: number): void {
    this.currentUsed = Math.min(this.limit, this.currentUsed + amount);
    this.touch();
  }

  /**
   * Subtract from current used amount
   */
  subtractFromUsedAmount(amount: number): void {
    this.currentUsed = Math.max(0, this.currentUsed - amount);
    this.touch();
  }

  /**
   * Get formatted limit
   */
  getFormattedLimit(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.limit);
  }

  /**
   * Get formatted current used
   */
  getFormattedCurrentUsed(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.currentUsed);
  }

  /**
   * Get formatted available limit
   */
  getFormattedAvailableLimit(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.getAvailableLimit());
  }

  /**
   * Get invoice period for a given date
   */
  getInvoicePeriod(date: Date = new Date()): { startDate: Date; endDate: Date } {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startDate = new Date(year, month - 1, this.closingDay + 1);
    const endDate = new Date(year, month, this.closingDay);
    
    return { startDate, endDate };
  }

  /**
   * Get due date for a given invoice period
   */
  getDueDate(invoiceEndDate: Date): Date {
    const dueDate = new Date(invoiceEndDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(this.dueDay);
    return dueDate;
  }

  /**
   * Check if card is overdue (simplified logic)
   */
  isOverdue(): boolean {
    // This would need to be implemented with actual invoice data
    // For now, return false as we don't have invoice tracking
    return false;
  }

  /**
   * Validate credit card data
   */
  validate(): { isValid: boolean; errors: string[] } {
    try {
      CreditCardModel.validationSchema.parse({
        name: this.name,
        brand: this.brand,
        bank: this.bank,
        limit: this.limit,
        currentUsed: this.currentUsed,
        closingDay: this.closingDay,
        dueDay: this.dueDay,
        color: this.color,
        isActive: this.isActive,
        isBlocked: this.isBlocked
      });

      // Additional business logic validation
      const errors: string[] = [];

      if (this.currentUsed > this.limit) {
        errors.push('Valor usado não pode exceder o limite');
      }

      if (this.closingDay === this.dueDay) {
        errors.push('Dia de fechamento não pode ser igual ao dia de vencimento');
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
      name: this.name,
      brand: this.brand,
      bank: this.bank,
      limit: this.limit.toString(),
      currentUsed: this.currentUsed.toString(),
      closingDay: this.closingDay,
      dueDay: this.dueDay,
      color: this.color,
      isActive: this.isActive,
      isBlocked: this.isBlocked
    };
  }

  /**
   * Create from database data
   */
  static fromData(data: any): CreditCardModel {
    return new CreditCardModel({
      ...data,
      limit: parseFloat(data.limit),
      currentUsed: parseFloat(data.currentUsed)
    });
  }
}