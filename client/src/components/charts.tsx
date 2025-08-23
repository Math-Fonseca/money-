import { useRef, useEffect, useState } from 'react';
import { Chart, registerables } from 'chart.js';

// Registrar todos os componentes do Chart.js
Chart.register(...registerables);

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
  selectedMonth?: number;
  selectedYear?: number;
}

export default function Charts({ summary, categories, selectedMonth, selectedYear }: ChartProps) {
  const incomeExpensesChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chartsCreated, setChartsCreated] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [show12Months, setShow12Months] = useState(false); // Novo estado para controlar 6 ou 12 meses

  console.log('Charts component rendered with:', {
    summary: summary ? 'present' : 'undefined',
    categories: categories.length,
    Chart: typeof Chart,
    ChartGlobal: typeof Chart.getChart
  });

  // Cleanup function for charts
  const cleanupCharts = () => {
    try {
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
    } catch (error) {
      console.error('Error during chart cleanup:', error);
      // Não fazer nada se houver erro na limpeza
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
  const waitForCanvasElements = async (maxAttempts = 5): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts} to find canvas elements`);

      if (incomeExpensesChartRef.current && categoryChartRef.current) {
        console.log('Canvas elements found!');
        return true;
      }

      // Aguardar um pouco antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.error('Canvas elements not found after all attempts');
    return false;
  };

  // Função para buscar dados históricos reais de 6 ou 12 meses
  const generateHistoricalData = async (monthsCount: number = 6) => {
    const months = [];
    const incomeData = [];
    const expenseData = [];

    // Usar o mês e ano selecionados pelo usuário
    const targetMonth = (selectedMonth || new Date().getMonth() + 1) - 1; // -1 porque Date.getMonth() retorna 0-11
    const targetYear = selectedYear || new Date().getFullYear();

    for (let i = monthsCount - 1; i >= 0; i--) {
      let month = targetMonth - i;
      let year = targetYear;

      if (month < 0) {
        month += 12;
        year -= 1;
      }

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthAbbr = monthNames[month];
      const yearAbbr = year.toString().slice(-2); // Pega apenas os últimos 2 dígitos do ano
      months.push(`${monthAbbr}/${yearAbbr}`);

      console.log(`Processing month ${i}: ${monthAbbr}/${yearAbbr} (month: ${month + 1}, year: ${year})`);

      // Se for o mês selecionado, usar os dados reais do summary
      if (i === 0 && summary) {
        const income = summary.totalIncome || 0;
        const expense = summary.totalExpenses || 0;
        incomeData.push(income);
        expenseData.push(expense);
        console.log(`Current month (${monthAbbr}/${yearAbbr}): Income=${income}, Expense=${expense}`);
      } else {
        // Para meses anteriores, buscar dados reais da API
        try {
          const response = await fetch(`/api/financial-summary?month=${month + 1}&year=${year}`);
          if (response.ok) {
            const monthData = await response.json();
            const income = monthData.totalIncome || 0;
            const expense = monthData.totalExpenses || 0;
            incomeData.push(income);
            expenseData.push(expense);
            console.log(`Historical month (${monthAbbr}/${yearAbbr}): Income=${income}, Expense=${expense}`);
          } else {
            // Se não conseguir buscar, usar 0 (sem dados)
            incomeData.push(0);
            expenseData.push(0);
            console.log(`Historical month (${monthAbbr}/${yearAbbr}): No data, using 0`);
          }
        } catch (error) {
          console.error(`Erro ao buscar dados para ${monthAbbr}/${yearAbbr}:`, error);
          // Em caso de erro, usar 0 (sem dados)
          incomeData.push(0);
          expenseData.push(0);
          console.log(`Historical month (${monthAbbr}/${yearAbbr}): Error, using 0`);
        }
      }
    }

    console.log('generateHistoricalData returning:', {
      months,
      incomeData,
      expenseData,
      monthsCount
    });

    return { months, incomeData, expenseData };
  };

  // Função para criar os gráficos
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

      // Criar gráfico de receitas vs despesas com dados históricos
      if (incomeExpensesChartRef.current) {
        console.log('Creating income/expenses chart...');

        try {
          const { months, incomeData, expenseData } = await generateHistoricalData(show12Months ? 12 : 6);

          console.log('Historical data generated:', { months, incomeData, expenseData });
          console.log('Income data array:', incomeData);
          console.log('Expense data array:', expenseData);
          console.log('Data types:', {
            incomeTypes: incomeData.map(v => typeof v),
            expenseTypes: expenseData.map(v => typeof v)
          });

          const chartData = {
            labels: months,
            datasets: [{
              label: 'Receitas',
              data: incomeData,
              borderColor: '#10B981',
              backgroundColor: '#10B981',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#10B981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
            }, {
              label: 'Despesas',
              data: expenseData,
              borderColor: '#EF4444',
              backgroundColor: '#EF4444',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#EF4444',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
            }]
          };

          console.log('Creating chart with data:', chartData);

          const chart = new Chart(incomeExpensesChartRef.current, {
            type: 'line',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top' as const,
                  labels: {
                    usePointStyle: true,
                    padding: 20,
                  }
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: function (context) {
                      return `${context.dataset.label}: ${new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                      }).format(context.parsed.y)}`;
                    }
                  }
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
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                  }
                },
                x: {
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                  }
                }
              },
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              }
            }
          });

          console.log('Income/expenses chart created successfully:', chart);
        } catch (chartError) {
          console.error('Error creating income/expenses chart:', chartError);
        }
      } else {
        console.error('incomeExpensesChartRef.current is null');
      }

      // Criar gráfico de categorias
      if (categoryChartRef.current) {
        console.log('Creating category chart...');

        try {
          // Verificar se há dados de despesas por categoria
          const hasExpenses = summary?.totalExpenses && summary.totalExpenses > 0;
          const hasExpensesByCategory = summary?.expensesByCategory &&
            typeof summary.expensesByCategory === 'object' &&
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
                const amountValue = typeof amount === 'string' ? parseFloat(amount) : (typeof amount === 'number' ? amount : 0);

                return {
                  categoryId,
                  name: category?.name || 'Desconhecido',
                  amount: isNaN(amountValue) ? 0 : amountValue,
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
        } catch (chartError) {
          console.error('Error creating category chart:', chartError);
        }
      } else {
        console.error('categoryChartRef.current is null');
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

  useEffect(() => {
    console.log('Charts useEffect triggered with:', {
      summary: summary ? 'present' : 'undefined',
      categories: categories.length,
      totalExpenses: summary?.totalExpenses,
      totalIncome: summary?.totalIncome,
      show12Months
    });

    // Se não há dados, não tentar criar gráficos
    if (!summary || categories.length === 0) {
      console.log('No data available, skipping chart creation');
      setIsLoading(false);
      return;
    }

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
      }, 100);
    } else {
      attemptCreateCharts();
    }
  }, [summary, categories, show12Months]);

  const handleRetry = () => {
    setHasError(false);
    setRetryCount(0);
    setIsLoading(false);
    // Forçar re-render para tentar criar os gráficos novamente
    setTimeout(() => {
      if (summary && categories.length > 0) {
        createCharts();
      }
    }, 100);
  };

  // Se não há dados, mostrar mensagem apropriada
  if (!summary || categories.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Receitas vs Despesas ({show12Months ? '12' : '6'} meses)</h3>
          <div className="h-80 relative flex items-center justify-center">
            <p className="text-gray-500 text-center">Carregando dados financeiros...</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
          <div className="h-80 relative flex items-center justify-center">
            <p className="text-gray-500 text-center">Carregando categorias...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Receitas vs Despesas ({show12Months ? '12' : '6'} meses)
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">6 meses</span>
            <button
              onClick={() => setShow12Months(!show12Months)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${show12Months ? 'bg-primary' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${show12Months ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className="text-sm text-gray-600">12 meses</span>
          </div>
        </div>
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