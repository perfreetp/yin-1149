import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, ClipboardList, CalendarClock, AlertTriangle, BarChart3, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/patients', label: '患者列表', icon: Users },
  { path: '/assessment', label: '评估录入', icon: ClipboardList },
  { path: '/followup', label: '随访计划', icon: CalendarClock },
  { path: '/alerts', label: '预警看板', icon: AlertTriangle },
  { path: '/reports', label: '统计报表', icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-200">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
          <Moon className="text-white" size={22} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-neutral-700">睡眠门诊</h1>
          <p className="text-xs text-neutral-500">综合管理工作台</p>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-50 text-primary-600 shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
                    )
                  }
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="px-4 py-4 border-t border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-semibold">医</span>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">张医生</p>
            <p className="text-xs text-neutral-500">睡眠中心 · 主治医师</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
