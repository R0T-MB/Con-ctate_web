import React from 'react';
import { useTranslation } from 'react-i18next';

function Tabs({ activeTab, setActiveTab }) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'introduccion', labelKey: 'nav.intro' },
    { id: 'retos', labelKey: 'nav.retos' },
    { id: 'ia', labelKey: 'nav.ia' },
    { id: 'info', labelKey: 'nav.info' },
    { id: 'logros', labelKey: 'nav.logros' },
    { id: 'comunidad', labelKey: 'nav.comunidad' }, 
  ];

  return (
    <div className="mb-8 relative">
      {/* Indicadores de deslizamiento */}
      <div className="scroll-indicator scroll-indicator-left md:hidden"></div>
      <div className="scroll-indicator scroll-indicator-right md:hidden"></div>
      
      {/* Contenedor con scroll horizontal para móviles */}
      <nav className="scroll-container scrollbar-hide overflow-x-auto py-2 px-4 md:px-0 md:overflow-visible">
        <div className="flex gap-3 md:flex-wrap md:justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg shadow transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white scale-105'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default Tabs;