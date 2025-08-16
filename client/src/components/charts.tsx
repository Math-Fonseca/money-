import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!summary || !categories || !transactions) return;
    
    // Dynamically import Chart.js to avoid SSR issues
    import('chart.js/auto').then((Chart) => {
      // Destroy existing charts
      Chart.Chart.getChart(incomeExpensesChartRef.current!)?.destroy();
      Chart.Chart.getChart(categoryChartRef.current!)?.destroy();

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
          console.error('Erro ao carregar dados do gráfico:', error);
        });
      }

      // Category Breakdown Chart
      if (categoryChartRef.current && summary?.expensesByCategory) {
        const categoryData = Object.entries(summary.expensesByCategory)
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
    });
  }, [summary, categories, transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Income vs Expenses Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas vs Despesas</h3>
        <div className="h-64">
          <canvas ref={incomeExpensesChartRef}></canvas>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
        <div className="h-64">
          <canvas ref={categoryChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}
