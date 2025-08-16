export default function MonthProgress() {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const progressPercentage = (currentDay / daysInMonth) * 100;
  const remainingDays = daysInMonth - currentDay;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Progresso do mês</span>
        <span className="text-sm text-gray-600">{currentDay}/{daysInMonth} dias</span>
      </div>
      
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <p className="text-xs text-gray-500">
        Faltam {remainingDays} dias para o fim do mês
      </p>
    </div>
  );
}