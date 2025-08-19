import { Request, Response } from 'express';

/**
 * Base Controller Class
 * Provides common functionality for all controllers including error handling and response formatting
 */
export abstract class BaseController {
  /**
   * Send success response
   */
  protected sendSuccess(res: Response, data?: any, message?: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send error response
   */
  protected sendError(res: Response, message: string, statusCode: number = 500, errors?: any[]): void {
    res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  /**
   * Send validation error response
   */
  protected sendValidationError(res: Response, errors: string[]): void {
    this.sendError(res, 'Dados inválidos', 400, errors);
  }

  /**
   * Send not found response
   */
  protected sendNotFound(res: Response, resource: string = 'Resource'): void {
    this.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Handle async controller methods with error catching
   */
  protected asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
    return async (req: Request, res: Response) => {
      try {
        await fn(req, res);
      } catch (error) {
        console.error('Controller error:', error);
        
        if (error instanceof Error) {
          // Check for validation errors
          if (error.message.includes('Validation failed')) {
            const errors = error.message.replace('Validation failed: ', '').split(', ');
            this.sendValidationError(res, errors);
            return;
          }
          
          // Check for specific business logic errors
          if (error.message.includes('not found')) {
            this.sendNotFound(res);
            return;
          }
          
          if (error.message.includes('Limite do cartão insuficiente')) {
            this.sendError(res, error.message, 400);
            return;
          }
          
          if (error.message.includes('Cannot delete')) {
            this.sendError(res, error.message, 409);
            return;
          }
          
          this.sendError(res, error.message);
        } else {
          this.sendError(res, 'Erro interno do servidor');
        }
      }
    };
  }

  /**
   * Extract pagination parameters from request
   */
  protected getPaginationParams(req: Request): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  /**
   * Extract date range parameters from request
   */
  protected getDateRangeParams(req: Request): { startDate?: string; endDate?: string } {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    return { startDate, endDate };
  }

  /**
   * Extract sort parameters from request
   */
  protected getSortParams(req: Request): { sortBy?: string; sortOrder: 'asc' | 'desc' } {
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    return { sortBy, sortOrder };
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequiredFields(req: Request, fields: string[]): string[] {
    const errors: string[] = [];
    
    for (const field of fields) {
      if (!req.body[field]) {
        errors.push(`${field} é obrigatório`);
      }
    }
    
    return errors;
  }

  /**
   * Log controller action for debugging
   */
  protected logAction(action: string, req: Request, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${action}`, {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        data
      });
    }
  }
}