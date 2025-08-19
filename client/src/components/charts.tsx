import { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';

interface ChartProps {
  summary?: {
    expensesByCategory: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
  };
  categories: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export default function Charts({ summary, categories }: ChartProps) {
  const incomeExpensesChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up charts on unmount
      Chart.getChart(incomeExpensesChartRef.current!)?.destroy();
      Chart.getChart(categoryChartRef.current!)?.destroy();
    };
  }, []);

  useEffect(() => {
    if (hasError) return;

    // Income vs Expenses Chart
    if (incomeExpensesChartRef.current) {
      Chart.getChart(incomeExpensesChartRef.current)?.destroy();

      const fetchMonthlyData = async () => {
        const monthlyData = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
          const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const monthName = monthNames[targetDate.getMonth()];
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
      
      fetchMonthlyData().then(monthlyData => {
        if (!incomeExpensesChartRef.current) return;
        
        const months = monthlyData.map(d => d.monthName);
        const incomeData = monthlyData.map(d => d.income);
        const expenseData = monthlyData.map(d => d.expenses);

        new Chart(incomeExpensesChartRef.current, {
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
        setHasError(true);
      });
    }

    // Category Breakdown Chart
    if (categoryChartRef.current && summary?.expensesByCategory) {
      Chart.getChart(categoryChartRef.current)?.destroy();
      
      const expensesByCategory = summary.expensesByCategory;
      
      const categoryData = Object.entries(expensesByCategory)
        .map(([categoryId, amount]) => {
          const category = categories.find(c => c.id === categoryId);
          return {
            categoryId,
            name: category?.name || 'Desconhecido',
            amount: typeof amount === 'string' ? parseFloat(amount) : amount,
            color: category?.color || '#6B7280',
          };
        })
        .filter(item => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      if (categoryData.length > 0) {
        new Chart(categoryChartRef.current, {
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
  }, [summary, categories, hasError]);

  if (hasError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-600">Erro ao carregar gráfico de receitas/despesas</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-600">Erro ao carregar gráfico de categorias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Receitas vs Despesas (6 meses)</h3>
        <div className="h-80">
          <canvas ref={incomeExpensesChartRef}></canvas>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
        <div className="h-80">
          <canvas ref={categoryChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}