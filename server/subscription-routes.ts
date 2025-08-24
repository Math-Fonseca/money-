import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";

const router = Router();

// ⚡️ FUNÇÃO PARA CALCULAR LIMITE DO CARTÃO BASEADO NA FATURA ATUAL
const calculateCurrentInvoiceLimit = async (creditCardId: string) => {
  try {
    const creditCard = await storage.getCreditCardById(creditCardId);
    if (!creditCard) return 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const closingDay = creditCard.closingDay || 1;

    // Calcular período da fatura atual
    let invoiceStartDate: Date;
    let invoiceEndDate: Date;

    if (closingDay === 1) {
      // Se fecha no dia 1, fatura atual é do mês atual
      invoiceStartDate = new Date(currentYear, currentMonth, 1);
      invoiceEndDate = new Date(currentYear, currentMonth + 1, 0);
    } else {
      // Se fecha no dia X, fatura atual vai do dia X do mês anterior até dia X-1 do mês atual
      invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
      invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);
    }

    // Buscar transações da fatura atual
    const transactions = await storage.getTransactions();
    const currentInvoiceTransactions = transactions.filter(t => 
      t.creditCardId === creditCardId && 
      t.type === 'expense' &&
      t.date >= invoiceStartDate.toISOString().split('T')[0] &&
      t.date <= invoiceEndDate.toISOString().split('T')[0]
    );

    // Buscar assinaturas que devem aparecer na fatura atual
    const subscriptions = await storage.getSubscriptions();
    const currentInvoiceSubscriptions = subscriptions.filter(s => {
      if (s.creditCardId !== creditCardId || s.paymentMethod !== 'credito') {
        return false;
      }

      // Assinatura deve aparecer na fatura atual se:
      // 1. Está ativa E foi criada antes do início da fatura atual, OU
      // 2. Está ativa E foi criada durante a fatura atual
      const subscriptionCreated = new Date(s.createdAt || new Date());
      
      // REGRA 1: Assinatura criada antes do início da fatura atual
      if (subscriptionCreated.getTime() <= invoiceStartDate.getTime()) {
        return s.isActive;
      }
      
      // REGRA 2: Assinatura criada durante a fatura atual
      if (subscriptionCreated.getTime() >= invoiceStartDate.getTime() && 
          subscriptionCreated.getTime() <= invoiceEndDate.getTime()) {
        return s.isActive;
      }
      
      return false;
    });

    // Calcular total
    const transactionsTotal = currentInvoiceTransactions.reduce((sum, t) => 
      sum + parseFloat(t.amount), 0
    );
    
    const subscriptionsTotal = currentInvoiceSubscriptions.reduce((sum, s) => 
      sum + parseFloat(s.amount), 0
    );

    const totalUsed = transactionsTotal + subscriptionsTotal;

    // Atualizar o cartão
    await storage.updateCreditCard(creditCardId, {
      currentUsed: totalUsed.toFixed(2)
    });

    console.log(`🔥 Limite recalculado para cartão ${creditCard.name}: R$ ${totalUsed.toFixed(2)}`);
    console.log(`   - Transações: R$ ${transactionsTotal.toFixed(2)}`);
    console.log(`   - Assinaturas: R$ ${subscriptionsTotal.toFixed(2)}`);

    return totalUsed;
  } catch (error) {
    console.error('Erro ao calcular limite da fatura atual:', error);
    return 0;
  }
};

// 📊 GET /api/subscriptions/summary - Resumo das assinaturas
router.get("/summary", async (req, res) => {
  try {
    const subscriptions = await storage.getSubscriptions();
    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    
    // Calcular gasto mensal
    const monthlyAmount = activeSubscriptions.reduce((sum, s) => 
      sum + parseFloat(s.amount), 0
    );
    
    // Calcular gasto anual
    const yearlyAmount = monthlyAmount * 12;
    
    // Contar por método de pagamento
    const byPaymentMethod = activeSubscriptions.reduce((acc, s) => {
      const method = s.paymentMethod;
      acc[method] = (acc[method] || 0) + parseFloat(s.amount);
      return acc;
    }, {} as Record<string, number>);
    
    // Contar por categoria
    const byCategory = activeSubscriptions.reduce((acc, s) => {
      if (s.categoryId) {
        acc[s.categoryId] = (acc[s.categoryId] || 0) + parseFloat(s.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        totalActive: activeSubscriptions.length,
        totalInactive: subscriptions.length - activeSubscriptions.length,
        monthlyAmount: monthlyAmount.toFixed(2),
        yearlyAmount: yearlyAmount.toFixed(2),
        byPaymentMethod,
        byCategory,
        subscriptions: activeSubscriptions
      }
    });
  } catch (error) {
    console.error('Erro ao buscar resumo das assinaturas:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar resumo das assinaturas" 
    });
  }
});

// 📱 GET /api/subscriptions - Listar todas as assinaturas
router.get("/", async (req, res) => {
  try {
    const { active } = req.query;
    
    let subscriptions;
    if (active === 'true') {
      subscriptions = await storage.getActiveSubscriptions();
    } else if (active === 'false') {
      const allSubscriptions = await storage.getSubscriptions();
      subscriptions = allSubscriptions.filter(s => !s.isActive);
    } else {
      subscriptions = await storage.getSubscriptions();
    }
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar assinaturas" 
    });
  }
});

// 📱 GET /api/subscriptions/:id - Buscar assinatura específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await storage.getSubscriptionById(id);
    
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar assinatura" 
    });
  }
});

// ➕ POST /api/subscriptions - Criar nova assinatura
router.post("/", async (req, res) => {
  try {
    const subscriptionData = insertSubscriptionSchema.parse(req.body);
    const newSubscription = await storage.createSubscription(subscriptionData);
    
    // Se for assinatura de cartão de crédito, recalcular limite
    if (newSubscription.paymentMethod === 'credito' && newSubscription.creditCardId) {
      await calculateCurrentInvoiceLimit(newSubscription.creditCardId);
    }
    
    res.status(201).json({
      success: true,
      data: newSubscription,
      message: "Assinatura criada com sucesso!"
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        message: "Dados inválidos", 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Erro ao criar assinatura" 
      });
    }
  }
});

// ✏️ PUT /api/subscriptions/:id - Atualizar assinatura
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedSubscription = await storage.updateSubscription(id, updates);
    
    if (!updatedSubscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    // Se for assinatura de cartão de crédito, recalcular limite
    if (updatedSubscription.paymentMethod === 'credito' && updatedSubscription.creditCardId) {
      await calculateCurrentInvoiceLimit(updatedSubscription.creditCardId);
    }
    
    res.json({
      success: true,
      data: updatedSubscription,
      message: "Assinatura atualizada com sucesso!"
    });
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        message: "Dados inválidos", 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Erro ao atualizar assinatura" 
      });
    }
  }
});

// 🚫 DELETE /api/subscriptions/:id - Excluir assinatura
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar assinatura antes de deletar para verificar se é de cartão de crédito
    const subscription = await storage.getSubscriptionById(id);
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    const deleted = await storage.deleteSubscription(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    // Se era assinatura de cartão de crédito, recalcular limite
    if (subscription.paymentMethod === 'credito' && subscription.creditCardId) {
      await calculateCurrentInvoiceLimit(subscription.creditCardId);
    }
    
    res.json({
      success: true,
      message: "Assinatura excluída com sucesso!"
    });
  } catch (error) {
    console.error('Erro ao excluir assinatura:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao excluir assinatura" 
    });
  }
});

// 🔄 PUT /api/subscriptions/:id/toggle - Ativar/Desativar assinatura
router.put("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await storage.getSubscriptionById(id);
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    const newStatus = !subscription.isActive;
    const updatedSubscription = await storage.updateSubscription(id, { 
      isActive: newStatus 
    });
    
    if (!updatedSubscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    // Se for assinatura de cartão de crédito, recalcular limite
    if (updatedSubscription.paymentMethod === 'credito' && updatedSubscription.creditCardId) {
      await calculateCurrentInvoiceLimit(updatedSubscription.creditCardId);
    }
    
    const action = newStatus ? "ativada" : "desativada";
    
    res.json({
      success: true,
      data: updatedSubscription,
      message: `Assinatura ${action} com sucesso!`
    });
  } catch (error) {
    console.error('Erro ao alterar status da assinatura:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao alterar status da assinatura" 
    });
  }
});

// 💳 GET /api/subscriptions/credit-card/:creditCardId - Assinaturas de um cartão específico
router.get("/credit-card/:creditCardId", async (req, res) => {
  try {
    const { creditCardId } = req.params;
    const subscriptions = await storage.getSubscriptions();
    
    const creditCardSubscriptions = subscriptions.filter(s => 
      s.creditCardId === creditCardId && s.paymentMethod === 'credito'
    );
    
    res.json({
      success: true,
      data: creditCardSubscriptions
    });
  } catch (error) {
    console.error('Erro ao buscar assinaturas do cartão:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar assinaturas do cartão" 
    });
  }
});

// 📅 GET /api/subscriptions/credit-card/:creditCardId/period/:startDate/:endDate - Assinaturas por período
router.get("/credit-card/:creditCardId/period/:startDate/:endDate", async (req, res) => {
  try {
    const { creditCardId, startDate, endDate } = req.params;
    const subscriptions = await storage.getSubscriptions();
    
    // Filtrar assinaturas que devem aparecer na fatura do período
    const periodSubscriptions = subscriptions.filter(s => {
      if (s.creditCardId !== creditCardId || 
          s.paymentMethod !== 'credito' || 
          !s.isActive) {
        return false;
      }
      
      const subscriptionCreated = new Date(s.createdAt || new Date());
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      
      // Assinatura deve aparecer se:
      // 1. Foi criada antes do início do período, OU
      // 2. Foi criada durante o período
      return subscriptionCreated.getTime() <= periodEnd.getTime();
    });
    
    // Transformar em formato de transação para a fatura
    const subscriptionTransactions = periodSubscriptions.map(s => ({
      id: `subscription-${s.id}`,
      description: `${s.name} (Assinatura)`,
      amount: s.amount,
      date: startDate,
      type: 'expense' as const,
      categoryId: s.categoryId,
      paymentMethod: 'credito',
      creditCardId: s.creditCardId,
      isSubscription: true,
      subscriptionId: s.id,
      service: s.service,
      isRecurring: 'Recorrente'
    }));
    
    res.json({
      success: true,
      data: subscriptionTransactions
    });
  } catch (error) {
    console.error('Erro ao buscar assinaturas por período:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar assinaturas por período" 
    });
  }
});

export default router;


