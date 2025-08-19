import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validation Middleware
 * Provides request validation using Zod schemas
 */
export class ValidationMiddleware {
  /**
   * Validate request body against a Zod schema
   */
  static validateBody(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.body);
        req.body = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: 'Dados de entrada inválidos',
            errors: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Erro de validação'
          });
        }
      }
    };
  }

  /**
   * Validate request parameters against a Zod schema
   */
  static validateParams(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.params);
        req.params = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: 'Parâmetros inválidos',
            errors: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Erro de validação de parâmetros'
          });
        }
      }
    };
  }

  /**
   * Validate request query parameters against a Zod schema
   */
  static validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.query);
        req.query = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: 'Parâmetros de consulta inválidos',
            errors: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Erro de validação de consulta'
          });
        }
      }
    };
  }
}

// Common validation schemas
export const ValidationSchemas = {
  // ID parameter validation
  idParam: z.object({
    id: z.string().uuid('ID deve ser um UUID válido')
  }),

  // Date range query validation
  dateRangeQuery: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de fim deve estar no formato YYYY-MM-DD').optional()
  }),

  // Pagination query validation
  paginationQuery: z.object({
    page: z.coerce.number().min(1, 'Página deve ser maior que 0').optional(),
    limit: z.coerce.number().min(1).max(100, 'Limite deve estar entre 1 e 100').optional()
  }),

  // Transaction creation validation
  createTransaction: z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Valor deve ser um número positivo'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
    type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo deve ser "income" ou "expense"' }) }),
    categoryId: z.string().min(1, 'Categoria é obrigatória'),
    paymentMethod: z.string().min(1, 'Método de pagamento é obrigatório'),
    creditCardId: z.string().optional(),
    installments: z.number().positive().optional(),
    installmentNumber: z.number().positive().optional(),
    parentTransactionId: z.string().optional(),
    isRecurring: z.boolean().optional()
  }),

  // Transaction update validation
  updateTransaction: z.object({
    description: z.string().min(1).optional(),
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    type: z.enum(['income', 'expense']).optional(),
    categoryId: z.string().min(1).optional(),
    paymentMethod: z.string().min(1).optional(),
    creditCardId: z.string().optional(),
    installments: z.number().positive().optional(),
    installmentNumber: z.number().positive().optional(),
    parentTransactionId: z.string().optional(),
    isRecurring: z.boolean().optional()
  }),

  // Credit card creation validation
  createCreditCard: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    brand: z.string().min(1, 'Bandeira é obrigatória'),
    bank: z.string().min(1, 'Banco é obrigatório'),
    limit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Limite deve ser um número positivo'),
    color: z.string().min(1, 'Cor é obrigatória'),
    closingDay: z.number().min(1).max(31, 'Dia de fechamento deve estar entre 1 e 31'),
    dueDay: z.number().min(1).max(31, 'Dia de vencimento deve estar entre 1 e 31'),
    isBlocked: z.boolean().optional()
  }),

  // Credit card update validation
  updateCreditCard: z.object({
    name: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    bank: z.string().min(1).optional(),
    limit: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0).optional(),
    color: z.string().min(1).optional(),
    closingDay: z.number().min(1).max(31).optional(),
    dueDay: z.number().min(1).max(31).optional(),
    isBlocked: z.boolean().optional(),
    isActive: z.boolean().optional()
  }),

  // Payment validation
  payment: z.object({
    paymentAmount: z.number().positive('Valor do pagamento deve ser positivo')
  }),

  // Purchase validation
  purchase: z.object({
    amount: z.number().positive('Valor da compra deve ser positivo')
  }),

  // Block/unblock validation
  toggleBlock: z.object({
    isBlocked: z.boolean()
  }),

  // Active/inactive validation
  toggleActive: z.object({
    isActive: z.boolean()
  })
};