import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import TransactionEditModal from "./transaction-edit-modal";
import RecurringDeleteModal from "./recurring-delete-modal";
import InstallmentDeleteModal from "./installment-delete-modal";

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  categoryId?: string;
  paymentMethod?: string;
  installments?: number;
  installmentNumber?: number;
  parentTransactionId?: string;
  isRecurring?: boolean;
  isInstallment?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  categories: Category[];
  showFilters?: boolean;
}

export default function TransactionHistory({ 
  transactions, 
  categories, 
  showFilters = true 
}: TransactionHistoryProps) {
  const [filters, setFilters] = useState({
    period: "all",
    type: "all",
    categoryId: "all",
    search: "",
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showRecurringDeleteModal, setShowRecurringDeleteModal] = useState(false);
  const [showInstallmentDeleteModal, setShowInstallmentDeleteModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-cards"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir transação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getCategoryInfo = (categoryId?: string) => {
    if (!categoryId) return { name: "Sem categoria", icon: "📦", color: "#6B7280" };
    const category = categories.find(c => c.id === categoryId);
    return category || { name: "Categoria não encontrada", icon: "❓", color: "#6B7280" };
  };

  const getPaymentMethodLabel = (method?: string) => {
    const methods: Record<string, string> = {
      dinheiro: "💵 Dinheiro",
      debito: "💳 Débito",
      credito: "🔷 Crédito",
      pix: "📱 PIX",
      transferencia: "🏦 Transferência",
    };
    return methods[method || ""] || "Não informado";
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.type !== "all" && transaction.type !== filters.type) {
      return false;
    }

    if (filters.categoryId !== "all" && transaction.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    return true;
  });

  const handleDeleteTransaction = (id: string) => {
    deleteTransactionMutation.mutate(id);
  };

  if (!showFilters) {
    // Simple list for dashboard
    return (
      <div className="space-y-4">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const categoryInfo = getCategoryInfo(transaction.categoryId);
            return (
              <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div className={`w-10 h-10 bg-opacity-10 rounded-lg flex items-center justify-center mr-3 ${
                    transaction.type === 'income' ? 'bg-secondary' : 'bg-error'
                  }`}>
                    <span className={transaction.type === 'income' ? 'text-secondary' : 'text-error'}>
                      {categoryInfo.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-600">{categoryInfo.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.type === 'income' ? 'text-secondary' : 'text-error'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhuma transação encontrada</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Filters Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Transações</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Período</Label>
            <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="current-month">Mês atual</SelectItem>
                <SelectItem value="last-month">Mês passado</SelectItem>
                <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={filters.categoryId} onValueChange={(value) => setFilters(prev => ({ ...prev, categoryId: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Buscar</Label>
            <Input
              placeholder="Buscar transação..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const categoryInfo = getCategoryInfo(transaction.categoryId);
              return (
                <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 bg-opacity-10 rounded-lg flex items-center justify-center mr-4 ${
                      transaction.type === 'income' ? 'bg-secondary' : 'bg-error'
                    }`}>
                      <span className={`text-lg ${transaction.type === 'income' ? 'text-secondary' : 'text-error'}`}>
                        {categoryInfo.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                        {transaction.isInstallment && transaction.installments && transaction.installments > 1 && transaction.installmentNumber && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Parcela {transaction.installmentNumber}/{transaction.installments}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center text-sm text-gray-600">
                        <span>{categoryInfo.name}</span>
                        <span className="mx-2">•</span>
                        <span>{getPaymentMethodLabel(transaction.paymentMethod)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-secondary' : 'text-error'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-blue-600"
                      onClick={() => setEditingTransaction(transaction)}
                    >
                      ✏️
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => {
                        // ⚡️ NOVA LÓGICA USANDO CAMPOS DO BANCO DE DADOS
                        const isInstallment = Boolean(transaction.isInstallment);
                        const isRecurring = Boolean(transaction.isRecurring) && !isInstallment;
                        
                        console.log('⚡️ ANÁLISE EXCLUSÃO - LÓGICA CORRIGIDA:', {
                          id: transaction.id,
                          description: transaction.description,
                          installments: transaction.installments,
                          installmentNumber: transaction.installmentNumber,
                          parentTransactionId: transaction.parentTransactionId,
                          paymentMethod: transaction.paymentMethod,
                          isRecurringField: transaction.isRecurring,
                          isInstallmentField: transaction.isInstallment,
                          '🔥 isInstallment': isInstallment,
                          '✅ isRecurring': isRecurring,
                          '🎯 MODAL': isInstallment ? 'PARCELAS (SÓ EXCLUIR TODAS)' : isRecurring ? 'RECORRENTE (ESTA/TODAS)' : 'NORMAL'
                        });
                        
                        if (isInstallment) {
                          // Compra parcelada no cartão → APENAS "Excluir todas as parcelas"
                          setDeletingTransaction(transaction);
                          setShowInstallmentDeleteModal(true);
                        } else if (isRecurring) {
                          // Transação recorrente → "Apenas esta" ou "Todas as recorrentes"
                          setDeletingTransaction(transaction);
                          setShowRecurringDeleteModal(true);
                        } else {
                          // Transação única → Modal padrão simples
                          setDeletingTransaction(transaction);
                        }
                      }}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhuma transação encontrada</p>
          )}
        </div>
      </div>

      {/* Modals */}
      <TransactionEditModal
        transaction={editingTransaction}
        categories={categories}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />

      {/* Recurring Delete Modal */}
      <RecurringDeleteModal
        transaction={deletingTransaction}
        isOpen={showRecurringDeleteModal}
        onClose={() => {
          setShowRecurringDeleteModal(false);
          setDeletingTransaction(null);
        }}
      />

      {/* Installment Delete Modal */}
      <InstallmentDeleteModal
        transaction={deletingTransaction}
        isOpen={showInstallmentDeleteModal}
        onClose={() => {
          setShowInstallmentDeleteModal(false);
          setDeletingTransaction(null);
        }}
      />

      {/* Simple Delete Confirmation Dialog for regular transactions */}
      <AlertDialog open={!!deletingTransaction && !showRecurringDeleteModal && !showInstallmentDeleteModal} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a transação "{deletingTransaction?.description}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deletingTransaction) {
                  deleteTransactionMutation.mutate(deletingTransaction.id);
                  setDeletingTransaction(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
