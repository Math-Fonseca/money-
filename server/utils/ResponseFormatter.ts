/**
 * Response Formatter Utility
 * Standardizes API response format across the application
 */
export class ResponseFormatter {
  /**
   * Format success response
   */
  static success(data?: any, message?: string, pagination?: any) {
    const response: any = {
      success: true,
      timestamp: new Date().toISOString()
    };

    if (message) {
      response.message = message;
    }

    if (data !== undefined) {
      response.data = data;
    }

    if (pagination) {
      response.pagination = pagination;
    }

    return response;
  }

  /**
   * Format error response
   */
  static error(message: string, errors?: any[], code?: string) {
    const response: any = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors && errors.length > 0) {
      response.errors = errors;
    }

    if (code) {
      response.code = code;
    }

    return response;
  }

  /**
   * Format validation error response
   */
  static validationError(errors: string[]) {
    return this.error('Dados inválidos', errors, 'VALIDATION_ERROR');
  }

  /**
   * Format not found response
   */
  static notFound(resource: string = 'Resource') {
    return this.error(`${resource} não encontrado`, undefined, 'NOT_FOUND');
  }

  /**
   * Format unauthorized response
   */
  static unauthorized(message: string = 'Não autorizado') {
    return this.error(message, undefined, 'UNAUTHORIZED');
  }

  /**
   * Format forbidden response
   */
  static forbidden(message: string = 'Acesso negado') {
    return this.error(message, undefined, 'FORBIDDEN');
  }

  /**
   * Format conflict response
   */
  static conflict(message: string) {
    return this.error(message, undefined, 'CONFLICT');
  }

  /**
   * Format pagination metadata
   */
  static paginationMeta(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      currentPage: page,
      totalPages,
      pageSize: limit,
      totalItems: total,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Format paginated response
   */
  static paginated(data: any[], page: number, limit: number, total: number, message?: string) {
    return this.success(
      data,
      message,
      this.paginationMeta(page, limit, total)
    );
  }

  /**
   * Format list response with metadata
   */
  static list(data: any[], total?: number, message?: string) {
    const response = this.success(data, message);
    
    if (total !== undefined) {
      response.meta = {
        totalItems: total,
        itemCount: data.length
      };
    }

    return response;
  }

  /**
   * Format single item response
   */
  static item(data: any, message?: string) {
    return this.success(data, message);
  }

  /**
   * Format created response
   */
  static created(data: any, message?: string) {
    return this.success(data, message || 'Criado com sucesso');
  }

  /**
   * Format updated response
   */
  static updated(data: any, message?: string) {
    return this.success(data, message || 'Atualizado com sucesso');
  }

  /**
   * Format deleted response
   */
  static deleted(message?: string) {
    return this.success(undefined, message || 'Removido com sucesso');
  }

  /**
   * Format empty response for no content
   */
  static noContent() {
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }
}