interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "income", label: "💵 Receitas" },
    { id: "expenses", label: "💸 Despesas" },
    { id: "history", label: "📋 Histórico" },
  ];

  return (
    <nav className="mb-8">
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "text-primary bg-white shadow-sm"
                : "text-gray-600 bg-transparent hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
