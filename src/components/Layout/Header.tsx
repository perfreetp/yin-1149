import React from 'react';
import { Bell, Search, Settings } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const highRiskCount = useAppStore((state) => state.getHighRiskPatients().length);
  const overdueCount = useAppStore((state) => state.getOverdueTasks().length);
  
  return (
    <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h2 className="text-xl font-bold text-neutral-700">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="搜索患者姓名、病历号..."
            className="w-72 pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
        
        <button className="relative p-2.5 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
          <Bell size={20} />
          {(highRiskCount + overdueCount) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {highRiskCount + overdueCount}
            </span>
          )}
        </button>
        
        <button className="p-2.5 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};
