import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";

const router = Router();

// 📊 GET /api/subscriptions/summary - Resumo das assinaturas
router.get("/summary", async (req, res) => {
  try {
    const subscriptions = await storage.getSubscriptions();
    
    const totalMonthly = subscriptions
      .filter(s => s.isActive)
      .reduce((sum, s) => sum + parseFloat(s.amount), 0);
    
    const totalYearly = totalMonthly * 12;
    
    const byPaymentMethod = subscriptions
      .filter(s => s.isActive)
      .reduce((acc, s) => {
        const method = s.paymentMethod;
        if (!acc[method]) acc[method] = 0;
        acc[method] += parseFloat(s.amount);
        return acc;
      }, {} as Record<string, number>);
    
    res.json({
      success: true,
      data: {
        totalMonthly: totalMonthly.toFixed(2),
        totalYearly: totalYearly.toFixed(2),
        byPaymentMethod,
        totalActive: subscriptions.filter(s => s.isActive).length,
        totalInactive: subscriptions.filter(s => !s.isActive).length
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

// 📋 GET /api/subscriptions - Listar todas as assinaturas
router.get("/", async (req, res) => {
  try {
    const subscriptions = await storage.getSubscriptions();
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

// 🔍 GET /api/subscriptions/:id - Buscar assinatura específica
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
    const updateData = insertSubscriptionSchema.partial().parse(req.body);
    
    const updatedSubscription = await storage.updateSubscription(id, updateData);
    
    if (!updatedSubscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
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

// 🔄 PUT /api/subscriptions/:id/toggle - Ativar/Desativar assinatura
router.put("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    
    const toggledSubscription = await storage.toggleSubscription(id);
    
    if (!toggledSubscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    res.json({
      success: true,
      data: toggledSubscription,
      message: `Assinatura ${toggledSubscription.isActive ? 'ativada' : 'desativada'} com sucesso!`
    });
  } catch (error) {
    console.error('Erro ao alterar status da assinatura:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao alterar status da assinatura" 
    });
  }
});

// 🗑️ DELETE /api/subscriptions/:id - Excluir assinatura
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteSubscription(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
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

// 💳 POST /api/subscriptions/:id/include-in-invoice - Incluir assinatura na fatura atual
router.post("/:id/include-in-invoice", async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await storage.getSubscriptionById(id);
    
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Assinatura não encontrada" 
      });
    }
    
    if (subscription.paymentMethod !== 'credito' || !subscription.creditCardId) {
      return res.status(400).json({ 
        success: false, 
        message: "Esta assinatura não é de cartão de crédito" 
      });
    }
    
    // Criar transação para a fatura atual
    const today = new Date();
    const transaction = {
      id: `subscription-${subscription.id}-${Date.now()}`,
      description: `${subscription.name} (Assinatura)`,
      amount: subscription.amount,
      date: today.toISOString().split('T')[0],
      type: 'expense' as const,
      categoryId: subscription.categoryId || 'none',
      paymentMethod: 'credito',
      creditCardId: subscription.creditCardId,
      isSubscription: true,
      subscriptionId: subscription.id,
      createdAt: today,
      isRecurring: true
    };
    
    // Salvar a transação
    await storage.createTransaction(transaction);
    
    // Atualizar o limite usado do cartão
    const creditCard = await storage.getCreditCardById(subscription.creditCardId);
    if (creditCard) {
      const currentUsed = parseFloat(creditCard.currentUsed || '0');
      const newUsed = currentUsed + parseFloat(subscription.amount);
      
      await storage.updateCreditCard(subscription.creditCardId, {
        currentUsed: newUsed.toFixed(2)
      });
    }
    
    res.json({
      success: true,
      data: transaction,
      message: "Assinatura incluída na fatura atual com sucesso!"
    });
  } catch (error) {
    console.error('Erro ao incluir assinatura na fatura:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao incluir assinatura na fatura" 
    });
  }
});

export default router;



