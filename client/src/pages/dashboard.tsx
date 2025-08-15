import { useState } from "react";
import NavigationTabs from "@/components/navigation-tabs";
import FinancialSummary from "@/components/financial-summary";
import IncomeForm from "@/components/income-form";
import ExpenseForm from "@/components/expense-form";
import TransactionHistory from "@/components/transaction-history";
import Charts from "@/components/charts";
import MonthSelector from "@/components/month-selector";
import CategoryManager from "@/components/category-manager";
import SettingsManager from "@/components/settings-manager";
import CreditCardManager from "@/components/credit-card-manager";
import SubscriptionManager from "@/components/subscription-manager";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { data: summary } = useQuery<{
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
    expensesByCategory: Record<string, number>;
  }>({
    queryKey: ["/api/financial-summary", selectedMonth, selectedYear],
  });

  const { data: categories = [] } = useQuery<Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  }>>({
    queryKey: ["/api/categories"],
  });

  const { data: transactions = [] } = useQuery<Array<{
    id: string;
    description: string;
    amount: string;
    date: string;
    type: 'income' | 'expense';
    categoryId?: string;
  }>>({
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === "dashboard" && (
            <MonthSelector 
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              onMonthChange={(month, year) => {
                setSelectedMonth(month);
                setSelectedYear(year);
              }}
            />
          )}
        </div>

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

        {activeTab === "credit-cards" && (
          <CreditCardManager />
        )}

        {activeTab === "subscriptions" && (
          <SubscriptionManager />
        )}

        {activeTab === "categories" && (
          <CategoryManager categories={categories} />
        )}

        {activeTab === "settings" && (
          <SettingsManager />
        )}
      </div>
    </div>
  );
}
