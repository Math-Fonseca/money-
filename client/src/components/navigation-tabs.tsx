interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const tabs = [
    { id: "dashboard", label: "📊 Dashboard", short: "📊" },
    { id: "income", label: "💵 Receitas", short: "💵" },
    { id: "expenses", label: "💸 Despesas", short: "💸" },
    { id: "history", label: "📋 Histórico", short: "📋" },
    { id: "credit-expenses", label: "💳 Cartão Crédito", short: "💳" },
    { id: "credit-cards", label: "💳 Cartões", short: "💳" },
    { id: "subscriptions", label: "📱 Assinaturas", short: "📱" },
    { id: "categories", label: "🏷️ Categorias", short: "🏷️" },
    { id: "settings", label: "⚙️ Configurações", short: "⚙️" },
  ];

  return (
    <nav className="w-full">
      <div className="flex overflow-x-auto bg-gray-100 rounded-lg p-1 space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-colors min-w-fit ${
              activeTab === tab.id
                ? "text-primary bg-white shadow-sm"
                : "text-gray-600 bg-transparent hover:text-gray-900"
            }`}
          >
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
