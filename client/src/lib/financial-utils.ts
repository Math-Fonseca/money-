export function calculateWorkingDays(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Get the first and last day of the month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let workingDays = 0;
  
  // Iterate through all days in the month
  for (let day = firstDay.getDate(); day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    
    // Count Monday (1) through Friday (5) as working days
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }
  
  return workingDays;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR');
}

export function generateMonthlyReport(
  transactions: Array<{
    id: string;
    amount: string;
    date: string;
    type: 'income' | 'expense';
    categoryId?: string;
  }>,
  month: number,
  year: number
) {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  const monthTransactions = transactions.filter(
    t => t.date >= startDate && t.date <= endDate
  );
  
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const totalExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const balance = totalIncome - totalExpenses;
  
  return {
    totalIncome,
    totalExpenses,
    balance,
    transactions: monthTransactions,
  };
}

export function calculateInstallments(
  amount: number,
  installments: number,
  startDate: string
): Array<{ amount: number; date: string; installmentNumber: number }> {
  const installmentAmount = amount / installments;
  const result = [];
  
  for (let i = 0; i < installments; i++) {
    const installmentDate = new Date(startDate);
    installmentDate.setMonth(installmentDate.getMonth() + i);
    
    result.push({
      amount: installmentAmount,
      date: installmentDate.toISOString().split('T')[0],
      installmentNumber: i + 1,
    });
  }
  
  return result;
}
