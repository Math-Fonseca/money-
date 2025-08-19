import { useEffect, useRef, useState } from "react";

interface ChartsProps {
  summary?: {
    totalIncome: number;
    totalExpenses: number;
    expensesByCategory: Record<string, number>;
  };
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  transactions: Array<{
    id: string;
    amount: string;
    date: string;
    type: 'income' | 'expense';
    categoryId?: string;
  }>;
  selectedMonth: number;
  selectedYear: number;
}

export default function Charts({ summary, categories, transactions, selectedMonth, selectedYear }: ChartsProps) {
  const incomeExpensesChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const [chartsLoaded, setChartsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!summary || !categories || !transactions) return;
    
    // Reset error state
    setHasError(false);
    
    // Dynamically import Chart.js to avoid SSR issues
    import('chart.js/auto').then((Chart) => {
      // Destroy existing charts
      try {
        const incomeChart = Chart.Chart.getChart(incomeExpensesChartRef.current!);
        if (incomeChart) incomeChart.destroy();
        
        const categoryChart = Chart.Chart.getChart(categoryChartRef.current!);
        if (categoryChart) categoryChart.destroy();
      } catch (error) {
        // Silent cleanup
      }

      // Income vs Expenses Chart
      if (incomeExpensesChartRef.current) {
        // Generate monthly data for the last 6 months
        const months = [];
        const incomeData = [];
        const expenseData = [];
        
        // Create an async function to fetch financial data for 6 months around selected month
        const fetchMonthlyData = async () => {
          const monthlyData = [];
          
          for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(selectedYear, selectedMonth - 1 - i, 1);
            const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'short' });
            const yearShort = targetDate.getFullYear().toString().slice(-2);
            const month = targetDate.getMonth() + 1;
            const year = targetDate.getFullYear();
            
            try {
              const response = await fetch(`/api/financial-summary?month=${month}&year=${year}`);
              const data = await response.json();
              
              monthlyData.push({
                monthName: `${monthName}/${yearShort}`,
                income: data.totalIncome || 0,
                expenses: data.totalExpenses || 0
              });
            } catch (error) {
              // Silent error handling
              monthlyData.push({
                monthName: `${monthName}/${yearShort}`,
                income: 0,
                expenses: 0
              });
            }
          }
          
          return monthlyData;
        };
        
        // Fetch data and create chart
        fetchMonthlyData().then(monthlyData => {
          if (!incomeExpensesChartRef.current) return;
          
          const months = monthlyData.map(d => d.monthName);
          const incomeData = monthlyData.map(d => d.income);
          const expenseData = monthlyData.map(d => d.expenses);

          new Chart.Chart(incomeExpensesChartRef.current, {
            type: 'line',
            data: {
              labels: months,
              datasets: [{
                label: 'Receitas',
                data: incomeData,
                borderColor: '#10B981',
                backgroundColor: '#10B981',
                tension: 0.4,
                fill: false,
              }, {
                label: 'Despesas',
                data: expenseData,
                borderColor: '#EF4444',
                backgroundColor: '#EF4444',
                tension: 0.4,
                fill: false,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(value as number);
                    }
                  }
                }
              }
            }
          });
        }).catch(error => {
          // Silent error handling - don't log chart data errors
          setHasError(true);
        });
      }

      // Category Breakdown Chart
      if (categoryChartRef.current) {
        // Use expensesByCategory from financial summary (includes subscriptions)
        const expensesByCategory = summary?.expensesByCategory || {};

        const categoryData = Object.entries(expensesByCategory)
          .map(([categoryId, amount]) => {
            const category = categories.find(c => c.id === categoryId);
            return {
              categoryId,
              name: category?.name || 'Desconhecido',
              amount,
              color: category?.color || '#6B7280',
            };
          })
          .filter(item => item.amount > 0)
          .sort((a, b) => b.amount - a.amount);

        if (categoryData.length > 0) {
          new Chart.Chart(categoryChartRef.current, {
            type: 'doughnut',
            data: {
              labels: categoryData.map(item => item.name),
              datasets: [{
                data: categoryData.map(item => item.amount),
                backgroundColor: categoryData.map(item => item.color),
                borderWidth: 2,
                borderColor: '#ffffff',
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom' as const,
                  labels: {
                    padding: 20,
                    usePointStyle: true,
                  }
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const value = context.parsed;
                      const total = categoryData.reduce((sum, item) => sum + item.amount, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `${context.label}: ${new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value)} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        }
      }
      
      setChartsLoaded(true);
    }).catch(error => {
      // Silent error handling - don't log import errors
      setHasError(true);
      setChartsLoaded(true);
    });
  }, [summary, categories, transactions]);

  if (hasError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income vs Expenses Chart Fallback */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas vs Despesas</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-gray-500">📊</p>
              <p className="text-sm text-gray-500 mt-2">Gráfico temporariamente indisponível</p>
            </div>
          </div>
        </div>

        {/* Category Breakdown Chart Fallback */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-gray-500">📈</p>
              <p className="text-sm text-gray-500 mt-2">Gráfico temporariamente indisponível</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Income vs Expenses Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas vs Despesas</h3>
        <div className="h-64">
          {!chartsLoaded && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Carregando gráfico...</p>
              </div>
            </div>
          )}
          <canvas ref={incomeExpensesChartRef} style={{ display: chartsLoaded ? 'block' : 'none' }}></canvas>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
        <div className="h-64">
          {!chartsLoaded && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Carregando gráfico...</p>
              </div>
            </div>
          )}
          <canvas ref={categoryChartRef} style={{ display: chartsLoaded ? 'block' : 'none' }}></canvas>
        </div>
      </div>
    </div>
  );
}
