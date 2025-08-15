import { useState } from "react";
import NavigationTabs from "@/components/navigation-tabs";
import FinancialSummary from "@/components/financial-summary";
import IncomeForm from "@/components/income-form";
import ExpenseForm from "@/components/expense-form";
import TransactionHistory from "@/components/transaction-history";
import Charts from "@/components/charts";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { data: summary } = useQuery({
    queryKey: ["/api/financial-summary"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const currentDate = new Date().toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">💰 Controle Financeiro</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 capitalize">{currentDate}</span>
              <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Exportar Dados
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <FinancialSummary summary={summary} />
            <Charts 
              summary={summary} 
              categories={categories}
              transactions={transactions}
            />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
              </div>
              <div className="p-6">
                <TransactionHistory 
                  transactions={transactions.slice(0, 5)} 
                  categories={categories}
                  showFilters={false}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "income" && (
          <IncomeForm categories={categories.filter(c => c.type === 'income')} />
        )}

        {activeTab === "expenses" && (
          <ExpenseForm categories={categories.filter(c => c.type === 'expense')} />
        )}

        {activeTab === "history" && (
          <TransactionHistory 
            transactions={transactions} 
            categories={categories}
            showFilters={true}
          />
        )}
      </div>
    </div>
  );
}
