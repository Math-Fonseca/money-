import { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';

interface ChartProps {
  summary?: {
    expensesByCategory?: Record<string, number>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [chartsCreated, setChartsCreated] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  console.log('Charts component rendered');

  // Cleanup function for charts
  const cleanupCharts = () => {
    if (incomeExpensesChartRef.current) {
      const chart = Chart.getChart(incomeExpensesChartRef.current);
      if (chart) {
        console.log('Destroying income/expenses chart');
        chart.destroy();
      }
    }
    if (categoryChartRef.current) {
      const chart = Chart.getChart(categoryChartRef.current);
      if (chart) {
        console.log('Destroying category chart');
        chart.destroy();
      }
    }
  };

  useEffect(() => {
    console.log('Charts component mounted');
    return () => {
      console.log('Charts component unmounting');
      cleanupCharts();
    };
  }, []);

  // Função para aguardar os elementos canvas estarem disponíveis
  const waitForCanvasElements = async (maxAttempts = 10): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts} to find canvas elements`);

      if (incomeExpensesChartRef.current && categoryChartRef.current) {
        console.log('Canvas elements found!');
        return true;
      }

      // Aguardar um pouco antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.error('Canvas elements not found after all attempts');
    return false;
  };

  useEffect(() => {
    console.log('Charts useEffect triggered with:', {
      summary: summary ? 'present' : 'undefined',
      categories: categories.length,
      totalExpenses: summary?.totalExpenses,
      totalIncome: summary?.totalIncome
    });

    const createCharts = async () => {
      try {
        console.log('Creating charts with data:', {
          summary,
          categories: categories.length,
          totalExpenses: summary?.totalExpenses,
          totalIncome: summary?.totalIncome,
          expensesByCategory: summary?.expensesByCategory,
          expensesByCategoryKeys: summary?.expensesByCategory ? Object.keys(summary.expensesByCategory) : [],
          expensesByCategoryValues: summary?.expensesByCategory ? Object.values(summary.expensesByCategory) : []
        });

        // Log detalhado do summary
        if (summary) {
          console.log('=== DETALHES DO SUMMARY ===');
          console.log('summary.totalExpenses:', summary.totalExpenses);
          console.log('summary.expensesByCategory:', summary.expensesByCategory);
          console.log('typeof summary.expensesByCategory:', typeof summary.expensesByCategory);
          console.log('summary.expensesByCategory é null?', summary.expensesByCategory === null);
          console.log('summary.expensesByCategory é undefined?', summary.expensesByCategory === undefined);
          if (summary.expensesByCategory) {
            console.log('Chaves de expensesByCategory:', Object.keys(summary.expensesByCategory));
            console.log('Valores de expensesByCategory:', Object.values(summary.expensesByCategory));
          }
          console.log('=== FIM DOS DETALHES ===');
        }

        setIsLoading(true);
        setHasError(false);

        // Aguardar os elementos canvas estarem disponíveis
        const canvasElementsReady = await waitForCanvasElements();

        if (!canvasElementsReady) {
          console.error('Canvas elements not found!');
          setHasError(true);
          setIsLoading(false);
          return;
        }

        console.log('DOM ready, checking canvas elements...');
        console.log('incomeExpensesChartRef.current:', incomeExpensesChartRef.current);
        console.log('categoryChartRef.current:', categoryChartRef.current);

        // Limpar gráficos existentes
        cleanupCharts();

        // TESTE SIMPLES - Criar gráfico básico primeiro
        if (incomeExpensesChartRef.current) {
          console.log('Canvas element found, creating chart...');

          // Dados de teste simples
          const testData = {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
              label: 'Receitas',
              data: [0, 0, 0, 0, 0, summary?.totalIncome || 0],
              borderColor: '#10B981',
              backgroundColor: '#10B981',
              tension: 0.4,
              fill: false,
            }, {
              label: 'Despesas',
              data: [0, 0, 0, 0, 0, summary?.totalExpenses || 0],
              borderColor: '#EF4444',
              backgroundColor: '#EF4444',
              tension: 0.4,
              fill: false,
            }]
          };

          console.log('Creating chart with test data:', testData);

          const chart = new Chart(incomeExpensesChartRef.current, {
            type: 'line',
            data: testData,
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
                    callback: function (value) {
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

          console.log('Chart created successfully:', chart);
        }

        // Category Breakdown Chart - criar sempre, mas só mostrar dados se houver
        if (categoryChartRef.current) {
          // Verificar se há dados de despesas por categoria
          // Se expensesByCategory está undefined, mas há totalExpenses > 0, criar dados de teste
          const hasExpenses = summary?.totalExpenses && summary.totalExpenses > 0;
          const hasExpensesByCategory = summary?.expensesByCategory &&
            Object.values(summary.expensesByCategory).some(amount => amount > 0);

          console.log('Category chart check:', {
            hasExpenses,
            hasExpensesByCategory,
            totalExpenses: summary?.totalExpenses,
            expensesByCategory: summary?.expensesByCategory
          });

          if (hasExpenses && hasExpensesByCategory && summary?.expensesByCategory) {
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

            console.log('Category data for chart:', categoryData);

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
                        label: function (context) {
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
              console.log('Category chart created successfully');
            }
          } else if (hasExpenses && !hasExpensesByCategory) {
            // Se há despesas mas não há dados por categoria, criar um gráfico de teste
            console.log('Creating test category chart with total expenses');
            new Chart(categoryChartRef.current, {
              type: 'doughnut',
              data: {
                labels: ['Despesas Gerais'],
                datasets: [{
                  data: [summary?.totalExpenses || 0],
                  backgroundColor: ['#EF4444'],
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
                      label: function (context) {
                        return `Despesas Gerais: ${new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(context.parsed)}`;
                      }
                    }
                  }
                }
              }
            });
            console.log('Test category chart created successfully');
          }
          // Se não há dados, não criar gráfico (deixar fundo branco com mensagem)
        }

        console.log('Charts created successfully');
        setChartsCreated(true);
        setIsLoading(false);
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        console.error('Error creating charts:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    // Auto-retry mechanism
    const attemptCreateCharts = () => {
      if (retryCount < 3) {
        console.log(`Attempting to create charts (attempt ${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          createCharts();
        }, 200 * (retryCount + 1)); // Exponential backoff
      } else {
        console.error('Max retry attempts reached');
        setHasError(true);
        setIsLoading(false);
      }
    };

    if (!hasError || retryCount === 0) {
      console.log('Starting chart creation...');
      // Pequeno delay para garantir que o componente esteja renderizado
      setTimeout(() => {
        createCharts();
      }, 50);
    } else {
      attemptCreateCharts();
    }
  }, [summary, categories, hasError, retryCount]);

  const handleRetry = () => {
    setHasError(false);
    setRetryCount(0);
    setIsLoading(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-100 rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Carregando gráficos...</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Carregando gráficos...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-600">Erro ao carregar gráfico de receitas/despesas</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-600">Erro ao carregar gráfico de categorias</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Receitas vs Despesas (6 meses)</h3>
        <div className="h-80 relative">
          <canvas ref={incomeExpensesChartRef}></canvas>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
        <div className="h-80 relative">
          <canvas ref={categoryChartRef}></canvas>
          {(!summary?.totalExpenses || summary.totalExpenses === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-center">Nenhuma despesa cadastrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}