import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Search, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const expenseSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  isRecurring: z.boolean().default(false),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  selectedMonth?: number;
  selectedYear?: number;
}

export default function ExpenseForm({ categories, selectedMonth, selectedYear }: ExpenseFormProps) {
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactionsResponse } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/transactions"],
  });

  const allTransactions = transactionsResponse?.data || [];

  // Filtrar apenas transações de despesa que NÃO são de cartão de crédito
  // As despesas de cartão de crédito têm sua própria página dedicada
  const expenseTransactions = allTransactions.filter((t: any) => 
    t.type === 'expense' && !t.creditCardId
  );

  // Filtrar transações baseado nos filtros
  const filteredExpenseTransactions = expenseTransactions.filter((transaction: any) => {
    const matchesSearch = !searchTerm ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory ||
      selectedCategory === "all" ||
      transaction.categoryId === selectedCategory;

    const matchesDate = !dateFilter ||
      transaction.date === dateFilter;

    return matchesSearch && matchesCategory && matchesDate;
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      categoryId: "",
      paymentMethod: "pix",
      isRecurring: false,
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: "expense",
        }),
      });
      if (!response.ok) throw new Error("Failed to create transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      form.reset();
      toast({
        title: "Despesa cadastrada",
        description: "Despesa foi cadastrada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar despesa",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete transaction");
      // DELETE retorna 204 (sem conteúdo), não precisa fazer .json()
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      setDeletingTransaction(null);
      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir transação",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const deleteRecurringTransactionMutation = useMutation({
    mutationFn: async (parentId: string) => {
      const response = await fetch(`/api/transactions/recurring/${parentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir transações recorrentes');
      }

      // DELETE retorna 204 (sem conteúdo), não precisa fazer .json()
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      setDeletingTransaction(null);
      toast({
        title: "Transações recorrentes excluídas",
        description: "Todas as transações recorrentes foram excluídas com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir transações recorrentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir transações recorrentes. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createTransactionMutation.mutate(data);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    form.setValue("description", transaction.description);
    form.setValue("amount", transaction.amount);
    form.setValue("date", transaction.date);
    form.setValue("categoryId", transaction.categoryId);
    form.setValue("paymentMethod", transaction.paymentMethod);
    form.setValue("isRecurring", transaction.isRecurring || false);
  };

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseFormData }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'expense',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar despesa');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      setEditingTransaction(null);
      form.reset();
      toast({
        title: "Despesa atualizada",
        description: "A despesa foi atualizada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar despesa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateRecurringTransactionMutation = useMutation({
    mutationFn: async ({ parentId, data }: { parentId: string; data: ExpenseFormData }) => {
      const response = await fetch(`/api/transactions/recurring/${parentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'expense',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar transações recorrentes');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      setEditingTransaction(null);
      form.reset();
      toast({
        title: "Transações recorrentes atualizadas",
        description: "Todas as transações recorrentes foram atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar transações recorrentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar transações recorrentes. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (transaction: any) => {
    setDeletingTransaction(transaction);
  };

  const confirmDelete = (deleteType: 'single' | 'recurring' = 'single') => {
    if (deletingTransaction) {
      if (deleteType === 'recurring' && deletingTransaction.isRecurring) {
        // Se tem parentTransactionId, usar a rota de transações recorrentes
        const parentId = deletingTransaction.parentTransactionId || deletingTransaction.id;
        deleteRecurringTransactionMutation.mutate(parentId);
      } else {
        // Excluir apenas esta transação
        deleteTransactionMutation.mutate(deletingTransaction.id);
      }
    }
  };

  const handleUpdateRecurring = (updateType: 'single' | 'recurring') => {
    if (editingTransaction) {
      const formData = form.getValues();

      if (updateType === 'recurring') {
        // Atualizar todas as transações recorrentes
        const parentId = editingTransaction.parentTransactionId || editingTransaction.id;
        updateRecurringTransactionMutation.mutate({
          parentId,
          data: formData,
        });
      } else {
        // Atualizar apenas esta transação
        updateTransactionMutation.mutate({
          id: editingTransaction.id,
          data: formData,
        });
      }
    }
  };

  const expenseCategories = categories.filter(cat =>
    !["Salário", "Freelances", "Investimentos"].includes(cat.name)
  );

  // Calcular despesas por categoria (apenas do mês/ano selecionado)
  const expensesByCategory: { [key: string]: { amount: number; count: number } } = {};

  expenseTransactions.forEach((transaction: any) => {
    // Verificar se a transação é do mês/ano selecionado
    if (selectedMonth !== undefined && selectedYear !== undefined) {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.getMonth() + 1; // getMonth() retorna 0-11
      const transactionYear = transactionDate.getFullYear();

      // Só incluir se for do mês/ano selecionado
      if (transactionMonth === selectedMonth && transactionYear === selectedYear) {
        const categoryId = transaction.categoryId;
        if (!expensesByCategory[categoryId]) {
          expensesByCategory[categoryId] = { amount: 0, count: 0 };
        }
        expensesByCategory[categoryId].amount += parseFloat(transaction.amount);
        expensesByCategory[categoryId].count += 1;
      }
    }
  });

  const categoryExpenses = categories
    .map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      amount: expensesByCategory[category.id]?.amount || 0,
      count: expensesByCategory[category.id]?.count || 0,
    }))
    .filter(cat => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário de Cadastro */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Cadastrar Despesa</h2>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="categoryId">Categoria</Label>
                    <Select onValueChange={(value) => form.setValue("categoryId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.categoryId && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      placeholder="Ex: Almoço no restaurante"
                      {...form.register("description")}
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...form.register("amount")}
                    />
                    {form.formState.errors.amount && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.amount.message}
                      </p>
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
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.date.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                    <Select onValueChange={(value) => form.setValue("paymentMethod", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📱</span>
                            <span>PIX</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="debito">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💳</span>
                            <span>Cartão de Débito</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dinheiro">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💵</span>
                            <span>Dinheiro</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="transferencia">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏦</span>
                            <span>Transferência</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.paymentMethod && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.paymentMethod.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={form.watch("isRecurring")}
                      onCheckedChange={(checked) => form.setValue("isRecurring", checked as boolean)}
                    />
                    <Label htmlFor="isRecurring">Despesa recorrente</Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    disabled={createTransactionMutation.isPending}
                  >
                    {createTransactionMutation.isPending ? "Cadastrando..." : "Cadastrar Despesa"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Dicas */}
            <Card className="mt-6 lg:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dicas de Economia</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Configure seu orçamento mensal nas configurações para controle automático</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Use despesas recorrentes para contas fixas mensais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Organize suas despesas por categorias para identificar gastos desnecessários</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Revise regularmente seus gastos para encontrar oportunidades de economia</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Despesas */}
          <div className="lg:col-span-1">
            {/* Despesas por Categoria */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
                {categoryExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📊</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma despesa por categoria</h4>
                    <p className="text-gray-500">Suas despesas aparecerão aqui organizadas por categoria</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryExpenses.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{category.icon}</div>
                          <div>
                            <div className="font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">
                              {category.count} transação{category.count !== 1 ? 'ões' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600">
                            R$ {category.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Histórico de Despesas ({filteredExpenseTransactions.length})
                  </h3>
                </div>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Busca por texto */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filtro por categoria */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtro por data */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Botões de limpar filtros */}
                {(searchTerm || (selectedCategory && selectedCategory !== "all") || dateFilter) && (
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("");
                        setDateFilter("");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                )}

                {/* Lista de transações com altura fixa e rolagem */}
                <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {filteredExpenseTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">💸</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma despesa encontrada</h4>
                      <p className="text-sm text-gray-500">
                        {searchTerm || (selectedCategory && selectedCategory !== "all") || dateFilter
                          ? "Tente ajustar os filtros para encontrar despesas"
                          : "Cadastre sua primeira despesa usando o formulário ao lado"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredExpenseTransactions.map((transaction: any) => {
                        const category = categories.find(c => c.id === transaction.categoryId);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{category?.icon || "💰"}</div>
                              <div>
                                <div className="font-medium text-gray-900">{transaction.description}</div>
                                <div className="text-sm text-gray-500">
                                  {format(parseISO(transaction.date), "dd/MM/yyyy")} • {category?.name || "Despesa"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-semibold text-red-600">
                                  R$ {parseFloat(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </div>
                                {transaction.isRecurring && (
                                  <Badge variant="secondary" className="text-xs">Recorrente</Badge>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(transaction)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(transaction)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction?.isRecurring ? (
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    A despesa "{deletingTransaction?.description}" é recorrente.
                    O que você deseja fazer?
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-yellow-800 mb-3">
                      Opções disponíveis:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-yellow-600 text-lg mt-0.5 flex-shrink-0">•</span>
                        <div className="text-sm text-yellow-700 flex-1 min-w-0">
                          <span className="font-medium">Excluir apenas esta:</span>
                          <span className="block text-xs mt-1 text-yellow-600">Remove apenas esta transação específica</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-yellow-600 text-lg mt-0.5 flex-shrink-0">•</span>
                        <div className="text-sm text-yellow-700 flex-1 min-w-0">
                          <span className="font-medium">Excluir todas as recorrentes:</span>
                          <span className="block text-xs mt-1 text-yellow-600">Remove todas as transações futuras desta série</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-500 text-2xl">⚠️</div>
                    <div className="text-sm text-red-700">
                      <div className="font-medium">Atenção!</div>
                      <div className="text-xs mt-1">Esta ação não pode ser desfeita.</div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-center">
                    Tem certeza que deseja excluir a despesa <span className="font-semibold text-gray-900">"{deletingTransaction?.description}"</span>?
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {deletingTransaction?.isRecurring ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => confirmDelete('single')}
                  className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
                >
                  Excluir Apenas Esta
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => confirmDelete('recurring')}
                  className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
                >
                  Excluir Todas as Recorrentes
                </AlertDialogAction>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => confirmDelete('single')}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Excluir
                </AlertDialogAction>
              </div>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edição */}
      <AlertDialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              {editingTransaction?.isRecurring ? (
                <p className="text-sm text-gray-600">
                  Esta despesa é recorrente. Escolha se deseja atualizar apenas esta ou todas as recorrentes.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Edite os dados da despesa conforme necessário.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleUpdateRecurring('single'); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={form.watch("description")}
                  onChange={(e) => form.setValue("description", e.target.value)}
                  placeholder="Ex: Almoço no trabalho"
                />
              </div>

              <div>
                <Label htmlFor="edit-amount">Valor (R$)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={form.watch("amount")}
                  onChange={(e) => form.setValue("amount", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={form.watch("date")}
                  onChange={(e) => form.setValue("date", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-categoryId">Categoria</Label>
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
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-paymentMethod">Forma de Pagamento</Label>
              <Select
                value={form.watch("paymentMethod")}
                onValueChange={(value) => form.setValue("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span>PIX</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debito">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💳</span>
                      <span>Cartão de Débito</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="transferencia">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏦</span>
                      <span>Transferência</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dinheiro">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💵</span>
                      <span>Dinheiro</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isRecurring"
                checked={form.watch("isRecurring")}
                onCheckedChange={(checked) => form.setValue("isRecurring", checked as boolean)}
              />
              <Label htmlFor="edit-isRecurring">Despesa recorrente</Label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditingTransaction(null)}>
                Cancelar
              </AlertDialogCancel>
              {editingTransaction?.isRecurring ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleUpdateRecurring('single')}
                    disabled={updateTransactionMutation.isPending || updateRecurringTransactionMutation.isPending}
                    className="flex-1"
                  >
                    Atualizar Apenas Esta
                  </Button>
                  <Button
                    type="submit"
                    onClick={() => handleUpdateRecurring('recurring')}
                    disabled={updateTransactionMutation.isPending || updateRecurringTransactionMutation.isPending}
                    className="flex-1"
                  >
                    {updateRecurringTransactionMutation.isPending ? "Salvando..." : "Atualizar Todas as Recorrentes"}
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={updateTransactionMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateTransactionMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}