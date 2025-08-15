import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonthSelectorProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export default function MonthSelector({ currentMonth, currentYear, onMonthChange }: MonthSelectorProps) {
  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const currentYearOptions = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    currentYearOptions.push(year);
  }

  return (
    <div className="flex items-center space-x-4 bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Mês:</label>
        <Select
          value={currentMonth.toString()}
          onValueChange={(value) => onMonthChange(parseInt(value), currentYear)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Ano:</label>
        <Select
          value={currentYear.toString()}
          onValueChange={(value) => onMonthChange(currentMonth, parseInt(value))}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentYearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}