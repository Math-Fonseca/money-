import { Request, Response, NextFunction } from 'express';

/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */
export class ErrorHandlingMiddleware {
  /**
   * Global error handler middleware
   */
  static handle(error: any, req: Request, res: Response, next: NextFunction) {
    console.error('Unhandled error:', error);

    // If response was already sent, delegate to default Express error handler
    if (res.headersSent) {
      return next(error);
    }

    // Determine error type and send appropriate response
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.details || [error.message]
      });
    } else if (error.name === 'UnauthorizedError') {
      res.status(401).json({
        success: false,
        message: 'Não autorizado'
      });
    } else if (error.name === 'ForbiddenError') {
      res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    } else if (error.name === 'NotFoundError') {
      res.status(404).json({
        success: false,
        message: 'Recurso não encontrado'
      });
    } else if (error.name === 'ConflictError') {
      res.status(409).json({
        success: false,
        message: 'Conflito de dados'
      });
    } else if (error.name === 'DatabaseError') {
      res.status(500).json({
        success: false,
        message: 'Erro no banco de dados'
      });
    } else {
      // Generic server error
      res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? error.message || 'Erro interno do servidor'
          : 'Erro interno do servidor'
      });
    }
  }

  /**
   * 404 handler for unknown API routes only
   * Non-API routes should be handled by the frontend
   */
  static notFound(req: Request, res: Response, next: NextFunction) {
    // Only handle API routes with JSON 404 response
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        success: false,
        message: `Rota ${req.method} ${req.path} não encontrada`
      });
    } else {
      // Let other routes (frontend routes) continue to be handled by Vite
      next();
    }
  }

  /**
   * Request timeout handler
   */
  static timeout(req: Request, res: Response) {
    res.status(408).json({
      success: false,
      message: 'Timeout da requisição'
    });
  }
}

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string = 'Database error') {
    super(message);
    this.name = 'DatabaseError';
  }
}