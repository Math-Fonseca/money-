import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";

// Função para obter informações da bandeira do cartão
const getBrandInfo = (brand: string) => {
  const brands: { [key: string]: { name: string; icon: JSX.Element; color: string } } = {
    'mastercard': { 
      name: 'MasterCard', 
      icon: <CreditCard size={16} className="text-red-600" />, 
      color: '#EB001B' 
    },
    'visa': { 
      name: 'Visa', 
      icon: <CreditCard size={16} className="text-blue-600" />, 
      color: '#1A1F71' 
    },
    'elo': { 
      name: 'Elo', 
      icon: <CreditCard size={16} className="text-yellow-600" />, 
      color: '#FFC700' 
    },
    'american-express': { 
      name: 'American Express', 
      icon: <CreditCard size={16} className="text-blue-700" />, 
      color: '#006FCF' 
    },
    'hipercard': { 
      name: 'Hipercard', 
      icon: <CreditCard size={16} className="text-red-700" />, 
      color: '#E30613' 
    }
  };
  
  return brands[brand] || { 
    name: brand, 
    icon: <CreditCard size={16} className="text-gray-600" />, 
    color: '#6B7280' 
  };
};

const expenseSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  creditCardId: z.string().optional(),
  installments: z.number().min(1).default(1),
  isRecurring: z.boolean().default(false),
}).refine((data) => {
  // Se for cartão de crédito, creditCardId é obrigatório
  if (data.paymentMethod === "credito") {
    return data.creditCardId && data.creditCardId.length > 0;
  }
  return true;
}, {
  message: "Cartão de crédito é obrigatório para pagamento no crédito",
  path: ["creditCardId"]
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
}

export default function ExpenseForm({ categories }: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["/api/financial-summary"],
  });

  const { data: creditCardsResponse } = useQuery({
    queryKey: ["/api/credit-cards"],
  });

  // Handle MVC response format for credit cards
  const creditCards = (creditCardsResponse as any)?.success ? (creditCardsResponse as any).data : (Array.isArray(creditCardsResponse) ? creditCardsResponse : []);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      installments: 1,
      creditCardId: undefined,
      isRecurring: false,
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      // Não atualizar o cartão manualmente aqui - o backend já faz isso
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        type: "expense",
        creditCardId: data.paymentMethod === "credito" ? data.creditCardId : null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Despesa cadastrada",
        description: "A despesa foi cadastrada com sucesso!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
      queryClient.refetchQueries({ queryKey: ["/api/financial-summary"] });
    },
    onError: (error: any) => {
      // Verificar se é erro de limite insuficiente
      if (error.message?.includes("Limite do cartão insuficiente")) {
        toast({
          title: "Limite insuficiente",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao cadastrar despesa. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    // Verificar limite do cartão de crédito antes de enviar
    if (data.paymentMethod === "credito" && data.creditCardId) {
      const selectedCard = creditCards.find((card: any) => card.id === data.creditCardId);
      if (selectedCard) {
        const currentUsed = parseFloat(selectedCard.currentUsed || "0");
        const cardLimit = parseFloat(selectedCard.limit);
        const transactionAmount = parseFloat(data.amount);
        
        if (currentUsed + transactionAmount > cardLimit) {
          const availableLimit = cardLimit - currentUsed;
          toast({
            title: "Limite insuficiente",
            description: `Limite disponível: R$ ${availableLimit.toFixed(2)}. Valor da transação: R$ ${transactionAmount.toFixed(2)}`,
            variant: "destructive",
          });
          return; // Não enviar a transação
        }
      }
    }

    createExpenseMutation.mutate(data);
  };

  const paymentMethods = [
    { value: "dinheiro", label: "💵 Dinheiro" },
    { value: "debito", label: "💳 Cartão de Débito" },
    { value: "pix", label: "📱 PIX" },
    { value: "transferencia", label: "🏦 Transferência" },
  ];

  const isCredit = form.watch("paymentMethod") === "credito";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Calculate expenses by category for the summary
  const expensesByCategory = (summary as any)?.expensesByCategory || {};
  const categoryExpenses = categories.map(category => ({
    ...category,
    amount: expensesByCategory[category.id] || 0,
  })).filter(cat => cat.amount > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Expense Registration Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cadastrar Despesa</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                {categories.map((category) => (
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
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...form.register("description")}
              placeholder="Ex: Almoço no restaurante"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div>
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
            <Select
              value={form.watch("paymentMethod")}
              onValueChange={(value) => form.setValue("paymentMethod", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.paymentMethod.message}</p>
            )}
          </div>

          {isCredit && (
            <>
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
                      creditCards.map((card: any) => {
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
              
              <div>
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="24"
                  {...form.register("installments", { valueAsNumber: true })}
                  placeholder="1"
                />
                {form.formState.errors.installments && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.installments.message}</p>
                )}
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              {...form.register("isRecurring")}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isRecurring" className="text-sm">
              Despesa recorrente (repete mensalmente)
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-error hover:bg-red-600"
            disabled={createExpenseMutation.isPending}
          >
            {createExpenseMutation.isPending ? "Cadastrando..." : "Cadastrar Despesa"}
          </Button>
        </form>
      </div>

      {/* Expense Summary & Category Breakdown */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
          <div className="space-y-3">
            {categoryExpenses.length > 0 ? (
              categoryExpenses.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{category.icon}</span>
                    <span className="text-gray-700">{category.name}</span>
                  </div>
                  <span className="font-semibold text-error">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma despesa cadastrada ainda</p>
            )}
          </div>
        </div>

        {/* Quick Expense Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dicas de Economia</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">💡 Revise seus gastos mensalmente</p>
            <p className="text-sm text-gray-600">💡 Defina metas de orçamento por categoria</p>
            <p className="text-sm text-gray-600">💡 Use o cartão de débito para controlar gastos</p>
            <p className="text-sm text-gray-600">💡 Cadastre despesas imediatamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
