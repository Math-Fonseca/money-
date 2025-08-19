import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, CreditCard as CreditCardIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type Transaction, type Category, type CreditCard } from "@shared/schema";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const creditCardExpenseSchema = insertTransactionSchema.extend({
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  creditCardId: z.string().min(1, "Cartão de crédito é obrigatório"),
  installments: z.number().min(1).max(24).default(1),
}).omit({
  paymentMethod: true,
  type: true,
  isRecurring: true,
});

type CreditCardExpenseFormData = z.infer<typeof creditCardExpenseSchema>;

function CreditCardExpenses() {
  const queryClient = useQueryClient();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const form = useForm<CreditCardExpenseFormData>({
    resolver: zodResolver(creditCardExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      installments: 1,
    },
  });

  // Fetch data
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: creditCardsResponse } = useQuery<{ success: boolean; data: CreditCard[] }>({
    queryKey: ["/api/credit-cards"],
  });

  const { data: transactionsResponse } = useQuery<{ success: boolean; data: Transaction[] }>({
    queryKey: ["/api/transactions"],
  });

  const creditCards = creditCardsResponse?.data || [];
  const allTransactions = transactionsResponse?.data || [];
  
  // Filtrar apenas transações de cartão de crédito
  const creditCardTransactions = allTransactions.filter((t: Transaction) => 
    t.paymentMethod === 'credito' && t.type === 'expense'
  );

  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  // Mutations
  const createCreditCardExpenseMutation = useMutation({
    mutationFn: async (data: CreditCardExpenseFormData) => {
      return apiRequest("/api/transactions", "POST", {
        ...data,
        paymentMethod: "credito",
        type: "expense",
        isRecurring: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      form.reset({
        date: new Date().toISOString().split('T')[0],
        installments: 1,
      });
      toast({
        title: "Sucesso",
        description: "Despesa no cartão de crédito cadastrada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar despesa",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (data: { id: string; deleteAll?: boolean }) => {
      if (data.deleteAll) {
        return apiRequest(`/api/transactions/installments/${data.id}`, "DELETE");
      }
      return apiRequest(`/api/transactions/${data.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir despesa",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreditCardExpenseFormData) => {
    createCreditCardExpenseMutation.mutate(data);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const getCategoryInfo = (categoryId: string | null) => {
    const category = categories.find(c => c.id === categoryId);
    return category || { name: "Categoria", icon: "📦" };
  };

  const getBrandInfo = (brand: string) => {
    const brands: Record<string, { name: string; icon: string }> = {
      mastercard: { name: "MasterCard", icon: "💳" },
      visa: { name: "Visa", icon: "💳" },
      elo: { name: "Elo", icon: "💳" },
      "american-express": { name: "American Express", icon: "💳" },
      hipercard: { name: "Hipercard", icon: "💳" },
    };
    return brands[brand] || { name: brand, icon: "💳" };
  };

  const handleDelete = (transaction: Transaction) => {
    if (transaction.isInstallment || (transaction.installments && transaction.installments > 1)) {
      // Para parcelas, sempre excluir todas
      deleteTransactionMutation.mutate({ 
        id: transaction.parentTransactionId || transaction.id, 
        deleteAll: true 
      });
    } else {
      deleteTransactionMutation.mutate({ id: transaction.id });
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulário de Cadastro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5" />
            Cadastrar Despesa no Cartão de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Categoria</Label>
                <Select
                  value={form.watch("categoryId")}
                  onValueChange={(value) => form.setValue("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="creditCardId">Cartão de Crédito</Label>
                <Select
                  value={form.watch("creditCardId")}
                  onValueChange={(value) => form.setValue("creditCardId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.length > 0 ? (
                      creditCards.map((card: CreditCard) => {
                        const brandInfo = getBrandInfo(card.brand);
                        return (
                          <SelectItem key={card.id} value={card.id}>
                            <div className="flex items-center gap-2">
                              {brandInfo.icon}
                              {card.name} ({brandInfo.name})
                            </div>
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhum cartão cadastrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.creditCardId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.creditCardId.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                {...form.register("description")}
                placeholder="Ex: Compra no supermercado"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...form.register("amount")}
                  placeholder="0,00"
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="installments">Parcelas</Label>
                <Select
                  value={form.watch("installments")?.toString()}
                  onValueChange={(value) => form.setValue("installments", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="1x" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num === 1 ? "À Vista" : `${num}x${num > 1 ? ` (${formatCurrency((parseFloat(form.watch("amount") || "0") / num).toString())} cada)` : ""}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.installments && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.installments.message}</p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createCreditCardExpenseMutation.isPending}
            >
              {createCreditCardExpenseMutation.isPending ? "Cadastrando..." : "Cadastrar Despesa"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Despesas no Cartão de Crédito ({creditCardTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditCardTransactions.length > 0 ? (
              creditCardTransactions.map((transaction: Transaction) => {
                const categoryInfo = getCategoryInfo(transaction.categoryId);
                const card = creditCards.find((c: CreditCard) => c.id === transaction.creditCardId);
                const brandInfo = card ? getBrandInfo(card.brand) : { name: "Cartão", icon: "💳" };
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-lg text-red-600">{categoryInfo.icon}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description}
                          {transaction.installments && transaction.installments > 1 && (
                            <Badge variant="secondary" className="ml-2">
                              Parcela {transaction.installmentNumber || 1}/{transaction.installments}
                            </Badge>
                          )}
                        </p>
                        <div className="flex items-center text-sm text-gray-600">
                          <span>{categoryInfo.name}</span>
                          <span className="mx-2">•</span>
                          <span className="flex items-center gap-1">
                            {brandInfo.icon} {card?.name || "Cartão"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-red-600">
                          -{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-blue-600"
                          onClick={() => setEditingTransaction(transaction)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => handleDelete(transaction)}
                          disabled={deleteTransactionMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CreditCardIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma despesa no cartão de crédito</p>
                <p className="text-sm">Cadastre sua primeira despesa usando o formulário acima</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreditCardExpenses;