interface FinancialSummaryProps {
  summary?: {
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
    monthlySalary?: number;
    monthlyVT?: number;
    monthlyVR?: number;
    transactionIncome?: number;
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-secondary bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-secondary text-base sm:text-lg">💰</span>
            </div>
          </div>
          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Receita Total</p>
            <p className="text-lg sm:text-2xl font-bold text-secondary truncate">
              {summary ? formatCurrency(summary.totalIncome) : "R$ 0,00"}
            </p>
            {(summary?.monthlySalary || summary?.monthlyVT || summary?.monthlyVR) && (
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                {summary?.monthlySalary && summary.monthlySalary > 0 && (
                  <div className="truncate">Salário: {formatCurrency(summary.monthlySalary)}</div>
                )}
                {summary?.monthlyVT && summary.monthlyVT > 0 && (
                  <div className="truncate">VT: {formatCurrency(summary.monthlyVT)}</div>
                )}
                {summary?.monthlyVR && summary.monthlyVR > 0 && (
                  <div className="truncate">VR: {formatCurrency(summary.monthlyVR)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-error bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-error text-base sm:text-lg">💸</span>
            </div>
          </div>
          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Despesas Total</p>
            <p className="text-lg sm:text-2xl font-bold text-error truncate">
              {summary ? formatCurrency(summary.totalExpenses) : "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-primary text-base sm:text-lg">📊</span>
            </div>
          </div>
          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Saldo do Mês</p>
            <p className={`text-lg sm:text-2xl font-bold truncate ${summary && summary.currentBalance >= 0 ? 'text-primary' : 'text-error'}`}>
              {summary ? formatCurrency(summary.currentBalance) : "R$ 0,00"}
            </p>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Receitas - Despesas
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-accent bg-opacity-10 rounded-lg flex items-center justify-center">
              <span className="text-accent text-base sm:text-lg">🎯</span>
            </div>
          </div>
          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Situação Financeira</p>
            <p className={`text-lg sm:text-2xl font-bold truncate ${monthlyProjection >= 0 ? 'text-primary' : 'text-error'}`}>
              {monthlyProjection >= 0 ? 'Positiva' : 'Negativa'}
            </p>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {formatCurrency(Math.abs(monthlyProjection))} {monthlyProjection >= 0 ? 'de sobra' : 'em déficit'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
