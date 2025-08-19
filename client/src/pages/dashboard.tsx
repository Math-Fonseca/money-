import { useState, useEffect } from "react";
import NavigationTabs from "@/components/navigation-tabs";
import FinancialSummary from "@/components/financial-summary";
import IncomeForm from "@/components/income-form";
import ExpenseForm from "@/components/expense-form";
import TransactionHistory from "@/components/transaction-history";
import HistoryFilters from "@/components/history-filters";
import Charts from "@/components/charts";
import MonthSelector from "@/components/month-selector";
import SettingsManager from "@/components/settings-manager";
import CreditCardManager from "@/components/credit-card-manager";
import CreditCardExpenses from "@/components/credit-card-expenses";
import SubscriptionManager from "@/components/subscription-manager";
import { CategoryManager } from "@/components/category-manager";
import UserProfile from "@/components/user-profile";
import MonthProgress from "@/components/month-progress";
import WelcomeTutorial from "@/components/welcome-tutorial";
import { useQuery } from "@tanstack/react-query";

interface DashboardProps {
  userData: { name: string; email: string; profileImage?: string };
  onLogout: () => void;
  onUpdateProfile: (user: { name: string; email: string; profileImage?: string }) => void;
}

export default function Dashboard({ userData, onLogout, onUpdateProfile }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showTutorial, setShowTutorial] = useState(false);

  // Verificar se é o primeiro acesso do usuário
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(`tutorial_seen_${userData.email}`);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, [userData.email]);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem(`tutorial_seen_${userData.email}`, 'true');
  };
  
  const { data: summary, refetch: refetchSummary } = useQuery<{
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
    expensesByCategory: Record<string, number>;
    monthlySalary?: number;
    monthlyVT?: number;
    monthlyVR?: number;
    transactionIncome?: number;
  }>({
    queryKey: ["/api/financial-summary", selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/financial-summary?month=${selectedMonth}&year=${selectedYear}`);
      if (!response.ok) {
        throw new Error('Failed to fetch financial summary');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: categories = [] } = useQuery<Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  }>>({
    queryKey: ["/api/categories"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: transactionsResponse } = useQuery<{
    success: boolean;
    data: Array<{
      id: string;
      description: string;
      amount: string;
      date: string;
      type: 'income' | 'expense';
      categoryId?: string;
    }>;
  }>({
    queryKey: ["/api/transactions"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const transactions = transactionsResponse?.data || [];

  const currentDate = new Date().toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  }).replace(' de ', '/').replace(/^./, str => str.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">💰 Money+</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 capitalize">{currentDate}</span>
              <UserProfile 
                userData={userData}
                onUpdateProfile={onUpdateProfile}
                onLogout={onLogout}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <MonthProgress />
            <FinancialSummary summary={summary} />
            <Charts 
              summary={summary} 
              categories={categories || []}
              transactions={transactions || []}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
              </div>
              <div className="p-6">
                <TransactionHistory 
                  transactions={(transactions || []).slice(0, 5)} 
                  categories={categories || []}
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
          <HistoryFilters 
            transactions={transactions} 
            categories={categories}
          />
        )}

        {activeTab === "credit-expenses" && (
          <CreditCardExpenses />
        )}

        {activeTab === "credit-cards" && (
          <CreditCardManager />
        )}

        {activeTab === "subscriptions" && (
          <SubscriptionManager />
        )}

        {activeTab === "categories" && (
          <CategoryManager />
        )}

        {activeTab === "settings" && (
          <SettingsManager />
        )}
      </div>
      
      {/* Tutorial de boas-vindas */}
      <WelcomeTutorial 
        isOpen={showTutorial} 
        onClose={handleCloseTutorial} 
      />
    </div>
  );
}
