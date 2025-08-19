import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Search, Filter, X } from "lucide-react";
import TransactionEditModal from "./transaction-edit-modal";
import RecurringDeleteModal from "./recurring-delete-modal";

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  categoryId?: string;
  paymentMethod?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface HistoryFiltersProps {
  transactions: Transaction[];
  categories: Category[];
}

export default function HistoryFilters({ transactions, categories }: HistoryFiltersProps) {
  const [filters, setFilters] = useState({
    period: "all",
    type: "all", 
    categoryId: "all",
    search: "",
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

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
      credito: "💎 Crédito",
      pix: "📱 PIX",
      transferencia: "🏦 Transferência",
    };
    return methods[method || ""] || "Não informado";
  };

  // Filter transactions based on current filters
  const getFilteredTransactions = () => {
    if (!transactions) return [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // ⚡️ EXCLUIR DESPESAS DE CARTÃO DE CRÉDITO DO HISTÓRICO GERAL
      if (transaction.creditCardId && transaction.type === 'expense') {
        return false;
      }
      
      // Period filter - fix date ranges to be year-aware
      if (filters.period !== "all") {
        let startDate: Date;
        
        switch (filters.period) {
          case "last7":
            startDate = new Date();
            startDate.setDate(currentDate - 7);
            break;
          case "last30":
            startDate = new Date();
            startDate.setDate(currentDate - 30);
            break;
          case "last3months":
            startDate = new Date(currentYear, currentMonth - 3, currentDate);
            break;
          case "currentMonth":
            startDate = new Date(currentYear, currentMonth, 1);
            break;
          case "lastMonth":
            startDate = new Date(currentYear, currentMonth - 1, 1);
            const endDate = new Date(currentYear, currentMonth, 0); // Last day of previous month
            if (transactionDate < startDate || transactionDate > endDate) {
              return false;
            }
            break;
          default:
            startDate = new Date(0); // Beginning of time
        }
        
        if (filters.period !== "lastMonth" && transactionDate < startDate) {
          return false;
        }
      }
      
      // Search filter
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (filters.type !== "all" && transaction.type !== filters.type) {
        return false;
      }
      
      // Category filter
      if (filters.categoryId !== "all" && transaction.categoryId !== filters.categoryId) {
        return false;
      }
      
      // Period filter
      switch (filters.period) {
        case "current-month":
          return transactionDate.getMonth() === now.getMonth() && 
                 transactionDate.getFullYear() === now.getFullYear();
        case "last-month":
          const lastMonthDate = new Date(now);
          lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
          return transactionDate.getMonth() === lastMonthDate.getMonth() && 
                 transactionDate.getFullYear() === lastMonthDate.getFullYear();
        case "last-30-days":
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return transactionDate >= thirtyDaysAgo;
        case "last-3-months":
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return transactionDate >= threeMonthsAgo;
        case "this-year":
          return transactionDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredTransactions = getFilteredTransactions();

  const clearFilters = () => {
    setFilters({
      period: "all",
      type: "all",
      categoryId: "all", 
      search: "",
    });
  };

  const hasActiveFilters = filters.period !== "all" || filters.type !== "all" || 
                          filters.categoryId !== "all" || filters.search !== "";

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Period Filter */}
            <Select value={filters.period} onValueChange={(value) => setFilters({ ...filters, period: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="currentMonth">Mês atual</SelectItem>
                <SelectItem value="lastMonth">Mês passado</SelectItem>
                <SelectItem value="last30">Últimos 30 dias</SelectItem>
                <SelectItem value="last3months">Últimos 3 meses</SelectItem>
                <SelectItem value="last7">Últimos 7 dias</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filters.categoryId} onValueChange={(value) => setFilters({ ...filters, categoryId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transações ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => {
                const categoryInfo = getCategoryInfo(transaction.categoryId);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
                      >
                        {categoryInfo.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{categoryInfo.name}</span>
                          <span>•</span>
                          <span>{formatDate(transaction.date)}</span>
                          <span>•</span>
                          <span>{getPaymentMethodLabel(transaction.paymentMethod)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{transaction.type}</p>
                      </div>
                      <div className="flex gap-2">
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
                          onClick={() => setDeletingTransaction(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <p className="text-lg text-gray-600 mb-2">Nenhuma transação encontrada</p>
              <p className="text-sm text-gray-500">
                {hasActiveFilters 
                  ? "Tente ajustar os filtros para ver mais resultados"
                  : "Adicione transações para visualizar o histórico"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionEditModal
        transaction={editingTransaction}
        categories={categories}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />

      <RecurringDeleteModal
        transaction={deletingTransaction}
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
      />
    </div>
  );
}