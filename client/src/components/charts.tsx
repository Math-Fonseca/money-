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
}

export default function Charts({ summary, categories, transactions }: ChartsProps) {
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
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
          months.push(monthName);
          
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
          
          const monthTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const startDate = new Date(monthStart);
            const endDate = new Date(monthEnd);
            return transactionDate >= startDate && transactionDate <= endDate;
          });
          
          const monthIncome = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
          const monthExpenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
          
          incomeData.push(monthIncome);
          expenseData.push(monthExpenses);
        }

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
