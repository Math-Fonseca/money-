import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Search, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const incomeSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  paymentMethod: z.string().min(1, "Forma de pagamento é obrigatória"),
  isRecurring: z.boolean().default(false),
});

interface IncomeFormProps {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  selectedMonth?: number;
  selectedYear?: number;
}

export default function IncomeForm({ categories, selectedMonth, selectedYear }: IncomeFormProps) {
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const queryClient = useQueryClient();

  const { data: transactionsResponse } = useQuery<{ success: boolean; data: any[] } | any[]>({
    queryKey: ["/api/transactions"],
  });

  // Extrair transações considerando ambas as estruturas possíveis
  const allTransactions = Array.isArray(transactionsResponse)
    ? transactionsResponse
    : transactionsResponse?.data || [];

  // Aplicar filtros
  const filteredTransactions = allTransactions.filter((transaction: any) => {
    if (transaction.type !== 'income') return false;

    // Filtro por termo de busca
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtro por categoria
    if (selectedCategory && selectedCategory !== "all" && transaction.categoryId !== selectedCategory) {
      return false;
    }

    // Filtro por data
    if (dateFilter && transaction.date !== dateFilter) {
      return false;
    }

    return true;
  });

  const incomeTransactions = filteredTransactions;

  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
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
    mutationFn: async (data: z.infer<typeof incomeSchema>) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'income',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao cadastrar receita');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      form.reset();
      toast({
        title: "Receita cadastrada",
        description: "Receita foi cadastrada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir transação');
      }

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
    onError: (error) => {
      console.error('Erro ao excluir transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir transação. Tente novamente.",
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

  const onSubmit = async (data: z.infer<typeof incomeSchema>) => {
    createTransactionMutation.mutate(data);
  };

  const handleDeleteTransaction = (transaction: any) => {
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

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    editForm.setValue("description", transaction.description);
    editForm.setValue("amount", transaction.amount);
    editForm.setValue("date", transaction.date);
    editForm.setValue("categoryId", transaction.categoryId);
    editForm.setValue("paymentMethod", transaction.paymentMethod);
    editForm.setValue("isRecurring", transaction.isRecurring || false);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
    editForm.reset();
  };

  const editForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: "",
      categoryId: "",
      paymentMethod: "pix",
      isRecurring: false,
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof incomeSchema> }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'income',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar receita');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      setEditingTransaction(null);
      editForm.reset();
      toast({
        title: "Receita atualizada",
        description: "A receita foi atualizada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar receita. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateRecurringTransactionMutation = useMutation({
    mutationFn: async ({ parentId, data }: { parentId: string; data: z.infer<typeof incomeSchema> }) => {
      const response = await fetch(`/api/transactions/recurring/${parentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          type: 'income',
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
      editForm.reset();
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

  const onEditSubmit = async (data: z.infer<typeof incomeSchema>) => {
    if (editingTransaction) {
      updateTransactionMutation.mutate({ id: editingTransaction.id, data });
    }
  };

  const handleUpdateRecurring = (updateType: 'single' | 'recurring') => {
    if (editingTransaction) {
      const formData = editForm.getValues();

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário de Cadastro */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Cadastrar Receita</h2>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      {...form.register("description")}
                      placeholder="Ex: Salário Mensal"
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
                      {...form.register("amount")}
                      placeholder="0,00"
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
                    <Label htmlFor="categoryId">Categoria</Label>
                    <Select onValueChange={(value) => form.setValue("categoryId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{category.icon || "💰"}</span>
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
                    <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                    <Select onValueChange={(value) => form.setValue("paymentMethod", value)}>
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
                    {form.formState.errors.paymentMethod && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.paymentMethod.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={form.watch("isRecurring")}
                      onChange={(e) => form.setValue("isRecurring", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isRecurring">Receita recorrente</Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={createTransactionMutation.isPending}>
                    {createTransactionMutation.isPending ? "Cadastrando..." : "Cadastrar Receita"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Dicas */}
            <Card className="mt-6 lg:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dicas</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Configure seu salário mensal nas configurações para cálculos automáticos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Use receitas recorrentes para salários e rendas fixas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <span>Organize suas receitas por categorias para melhor controle</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Receitas */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Histórico de Receitas ({incomeTransactions.length})
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
                      {categories.map((category) => (
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
                  {incomeTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">📈</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma receita encontrada</h4>
                      <p className="text-gray-500">
                        {searchTerm || (selectedCategory && selectedCategory !== "all") || dateFilter
                          ? "Tente ajustar os filtros para encontrar receitas"
                          : "Cadastre sua primeira receita usando o formulário ao lado"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {incomeTransactions.map((transaction: any) => {
                        const category = categories.find(c => c.id === transaction.categoryId);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{category?.icon || "💰"}</div>
                              <div>
                                <div className="font-medium text-gray-900">{transaction.description}</div>
                                <div className="text-sm text-gray-500">
                                  {format(parseISO(transaction.date), "dd/MM/yyyy", { locale: ptBR })} • {category?.name || "Receita"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-semibold text-green-600">
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
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTransaction(transaction)}
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

      {/* Modal de edição */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                {...editForm.register("description")}
                placeholder="Ex: Salário Mensal"
              />
              {editForm.formState.errors.description && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                {...editForm.register("amount")}
                placeholder="0,00"
              />
              {editForm.formState.errors.amount && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                {...editForm.register("date")}
              />
              {editForm.formState.errors.date && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.date.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-categoryId">Categoria</Label>
              <Select
                value={editForm.watch("categoryId")}
                onValueChange={(value) => editForm.setValue("categoryId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon || "💰"}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.categoryId && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.categoryId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-paymentMethod">Forma de Pagamento</Label>
              <Select
                value={editForm.watch("paymentMethod")}
                onValueChange={(value) => editForm.setValue("paymentMethod", value)}
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
              {editForm.formState.errors.paymentMethod && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.paymentMethod.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isRecurring"
                checked={editForm.watch("isRecurring")}
                onChange={(e) => editForm.setValue("isRecurring", e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-isRecurring">Receita recorrente</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEditModal}>
                Cancelar
              </Button>
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
                <Button type="submit" disabled={updateTransactionMutation.isPending} className="w-full">
                  {updateTransactionMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {deletingTransaction?.isRecurring ? (
                <>
                  <p className="text-gray-700 leading-relaxed">
                    A receita "{deletingTransaction?.description}" é recorrente.
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
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-500 text-2xl">⚠️</div>
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Atenção!</p>
                      <p className="text-xs mt-1">Esta ação não pode ser desfeita.</p>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-center">
                    Tem certeza que deseja excluir a receita <span className="font-semibold text-gray-900">"{deletingTransaction?.description}"</span>?
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
    </div>
  );
}