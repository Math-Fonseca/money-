import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CreditCardService } from '../services/CreditCardService';
import { IStorage } from '../storage';

/**
 * Credit Card Controller
 * Handles HTTP requests related to credit cards
 */
export class CreditCardController extends BaseController {
  private creditCardService: CreditCardService;

  constructor(storage: IStorage) {
    super();
    this.creditCardService = new CreditCardService(storage);
  }

  /**
   * Get all credit cards
   */
  getAllCreditCards = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_ALL_CREDIT_CARDS', req);
    
    const activeOnly = req.query.active === 'true';
    
    let creditCards;
    if (activeOnly) {
      creditCards = await this.creditCardService.getActiveCreditCards();
    } else {
      creditCards = await this.creditCardService.getAllCreditCards();
    }

    this.sendSuccess(res, creditCards.map(cc => cc.toJSON()));
  });

  /**
   * Get credit card by ID
   */
  getCreditCardById = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_CREDIT_CARD_BY_ID', req);
    
    const { id } = req.params;
    const creditCard = await this.creditCardService.getCreditCardById(id);
    
    if (!creditCard) {
      this.sendNotFound(res, 'Cartão de crédito');
      return;
    }

    this.sendSuccess(res, creditCard.toJSON());
  });

  /**
   * Create a new credit card
   */
  createCreditCard = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('CREATE_CREDIT_CARD', req, req.body);
    
    const creditCard = await this.creditCardService.createCreditCard(req.body);
    this.sendSuccess(res, creditCard.toJSON(), 'Cartão de crédito criado com sucesso', 201);
  });

  /**
   * Update an existing credit card
   */
  updateCreditCard = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('UPDATE_CREDIT_CARD', req, req.body);
    
    const { id } = req.params;
    const creditCard = await this.creditCardService.updateCreditCard(id, req.body);
    
    this.sendSuccess(res, creditCard.toJSON(), 'Cartão de crédito atualizado com sucesso');
  });

  /**
   * Delete a credit card
   */
  deleteCreditCard = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('DELETE_CREDIT_CARD', req);
    
    const { id } = req.params;
    await this.creditCardService.deleteCreditCard(id);
    
    res.status(204).send();
  });

  /**
   * Block/unblock a credit card
   */
  toggleCreditCardBlock = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('TOGGLE_CREDIT_CARD_BLOCK', req, req.body);
    
    const { id } = req.params;
    const { isBlocked } = req.body;
    
    if (typeof isBlocked !== 'boolean') {
      this.sendError(res, 'isBlocked deve ser um valor booleano', 400);
      return;
    }
    
    const creditCard = await this.creditCardService.toggleCreditCardBlock(id, isBlocked);
    
    const message = isBlocked ? 'Cartão bloqueado com sucesso' : 'Cartão desbloqueado com sucesso';
    this.sendSuccess(res, creditCard.toJSON(), message);
  });

  /**
   * Activate/deactivate a credit card
   */
  toggleCreditCardActive = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('TOGGLE_CREDIT_CARD_ACTIVE', req, req.body);
    
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      this.sendError(res, 'isActive deve ser um valor booleano', 400);
      return;
    }
    
    const creditCard = await this.creditCardService.toggleCreditCardActive(id, isActive);
    
    const message = isActive ? 'Cartão ativado com sucesso' : 'Cartão desativado com sucesso';
    this.sendSuccess(res, creditCard.toJSON(), message);
  });

  /**
   * Calculate invoice for a credit card
   */
  calculateInvoice = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('CALCULATE_INVOICE', req);
    
    const { creditCardId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      this.sendError(res, 'Data de início e fim são obrigatórias', 400);
      return;
    }
    
    const invoice = await this.creditCardService.calculateInvoice(
      creditCardId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    this.sendSuccess(res, {
      ...invoice,
      creditCard: invoice.creditCard.toJSON()
    });
  });

  /**
   * Process credit card payment
   */
  processPayment = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('PROCESS_PAYMENT', req, req.body);
    
    const { id } = req.params;
    const { paymentAmount } = req.body;
    
    if (!paymentAmount || paymentAmount <= 0) {
      this.sendError(res, 'Valor do pagamento deve ser positivo', 400);
      return;
    }
    
    const creditCard = await this.creditCardService.processPayment(id, parseFloat(paymentAmount));
    
    this.sendSuccess(res, creditCard.toJSON(), 'Pagamento processado com sucesso');
  });

  /**
   * Get credit cards summary
   */
  getCreditCardsSummary = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_CREDIT_CARDS_SUMMARY', req);
    
    const summary = await this.creditCardService.getCreditCardsSummary();
    this.sendSuccess(res, summary);
  });

  /**
   * Validate if a purchase can be made
   */
  validatePurchase = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('VALIDATE_PURCHASE', req, req.body);
    
    const { id } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      this.sendError(res, 'Valor da compra deve ser positivo', 400);
      return;
    }
    
    const validation = await this.creditCardService.validatePurchase(id, parseFloat(amount));
    
    if (validation.canPurchase) {
      this.sendSuccess(res, validation, 'Compra pode ser realizada');
    } else {
      this.sendError(res, validation.reason || 'Compra não pode ser realizada', 400, [validation]);
    }
  });

  /**
   * Get credit card usage statistics
   */
  getUsageStatistics = this.asyncHandler(async (req: Request, res: Response) => {
    this.logAction('GET_USAGE_STATISTICS', req);
    
    const { id } = req.params;
    const creditCard = await this.creditCardService.getCreditCardById(id);
    
    if (!creditCard) {
      this.sendNotFound(res, 'Cartão de crédito');
      return;
    }

    const statistics = {
      limit: creditCard.getLimit(),
      currentUsed: creditCard.getCurrentUsed(),
      availableLimit: creditCard.getAvailableLimit(),
      usagePercentage: creditCard.getUsagePercentage(),
      formattedLimit: creditCard.getFormattedLimit(),
      formattedCurrentUsed: creditCard.getFormattedCurrentUsed(),
      formattedAvailableLimit: creditCard.getFormattedAvailableLimit(),
      isOverLimit: creditCard.getCurrentUsed() > creditCard.getLimit(),
      isNearLimit: creditCard.getUsagePercentage() > 80
    };

    this.sendSuccess(res, statistics);
  });
}