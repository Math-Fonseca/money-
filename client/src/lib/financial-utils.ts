// Utility functions for financial calculations

/**
 * Calculate the 5th business day of a given month and year
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2024)
 * @returns Date object for the 5th business day
 */
export function getFifthBusinessDay(month: number, year: number): Date {
  // Start with the first day of the month
  const firstDay = new Date(year, month - 1, 1);
  let businessDays = 0;
  let currentDay = 1;
  
  while (businessDays < 5) {
    const date = new Date(year, month - 1, currentDay);
    const dayOfWeek = date.getDay();
    
    // Monday = 1, Tuesday = 2, ..., Friday = 5, Saturday = 6, Sunday = 0
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDays++;
    }
    
    if (businessDays < 5) {
      currentDay++;
    }
  }
  
  return new Date(year, month - 1, currentDay);
}

/**
 * Format currency value for display in Brazilian Real
 * @param amount - Amount in decimal format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

/**
 * Check if a given date is a business day (Monday-Friday)
 * @param date - Date to check
 * @returns True if it's a business day
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get all business days in a given month
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2024)
 * @returns Array of business days in the month
 */
export function getBusinessDaysInMonth(month: number, year: number): Date[] {
  const businessDays: Date[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (isBusinessDay(date)) {
      businessDays.push(date);
    }
  }
  
  return businessDays;
}

/**
 * Calculate the number of working days in a given month
 * @param date - Optional date to calculate for (defaults to current date)
 * @returns Number of working days in the month
 */
export function calculateWorkingDays(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let workingDays = 0;
  
  for (let day = firstDay.getDate(); day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }
  
  return workingDays;
}

/**
 * Calculate projected monthly values for recurring items
 * @param baseAmount - Base amount to calculate from
 * @param isRecurring - Whether the item is recurring
 * @returns Projected amount for the month
 */
export function calculateMonthlyProjection(baseAmount: number, isRecurring: boolean): number {
  return isRecurring ? baseAmount : 0;
}

/**
 * Generate recurring transactions for future months
 * @param transactions - Base transactions to project
 * @param targetMonth - Target month for projection
 * @param targetYear - Target year for projection
 * @returns Array of projected transactions
 */
export function generateRecurringTransactions(
  transactions: Array<{
    id: string;
    description: string;
    amount: string;
    type: 'income' | 'expense';
    categoryId?: string;
    isRecurring?: boolean;
  }>,
  targetMonth: number,
  targetYear: number
): Array<any> {
  const projected = [];
  
  for (const transaction of transactions) {
    if (transaction.isRecurring) {
      // Generate a projected transaction for the target month
      projected.push({
        ...transaction,
        id: `projected-${transaction.id}-${targetMonth}-${targetYear}`,
        date: `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`,
        isProjected: true,
      });
    }
  }
  
  return projected;
}