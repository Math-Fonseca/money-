interface FinancialSummaryProps {
  summary?: {
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
  };
}

export default function FinancialSummary({ summary }: FinancialSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const monthlyProjection = summary ? summary.totalIncome - summary.totalExpenses : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-secondary bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-secondary text-lg">💰</span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">Receita Total</p>
            <p className="text-2xl font-bold text-secondary">
              {summary ? formatCurrency(summary.totalIncome) : "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-error bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-error text-lg">💸</span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">Despesas Total</p>
            <p className="text-2xl font-bold text-error">
              {summary ? formatCurrency(summary.totalExpenses) : "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-primary text-lg">📊</span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">Saldo Atual</p>
            <p className="text-2xl font-bold text-primary">
              {summary ? formatCurrency(summary.currentBalance) : "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-accent bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-accent text-lg">🎯</span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">Projeção Mensal</p>
            <p className="text-2xl font-bold text-accent">
              {formatCurrency(monthlyProjection)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
