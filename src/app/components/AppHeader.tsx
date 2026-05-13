import { Zap, History, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { Avatar } from './Avatar';
import { ProfileDropdown } from './ProfileDropdown';
import type { UserStats } from '../types/profile';

type DashView = 'summarize' | 'history';

interface AppHeaderProps {
  activeView: DashView;
  onViewChange: (v: DashView) => void;
  summaryCount: number;
  stats: UserStats;
}

/** App top bar with logo, navigation tabs, user menu, and theme toggle */
export function AppHeader({ 
  activeView, 
  onViewChange, 
  summaryCount,
  stats
}: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogoClick() {
    navigate('/');
  }

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  const tabs: { id: DashView; label: string; icon: typeof FileText }[] = [
    { id: 'summarize', label: 'Summarize', icon: FileText },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md font-[Inter,sans-serif]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2 shrink-0 group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg group-hover:shadow-indigo-600/50">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 dark:text-slate-100 hidden sm:block transition-all duration-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5">
            SummarizeAI
          </span>
        </button>

        {/* Tabs */}
        <nav className="flex-1 flex items-center gap-1 ml-4 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 whitespace-nowrap
                ${activeView === tab.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === 'history' && summaryCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium leading-none">
                  {summaryCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />

          {/* User menu / Profile Trigger */}
          <div className="relative ml-1">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className={`flex items-center gap-2.5 p-1 px-2 rounded-full transition-all duration-200
                ${menuOpen 
                  ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-indigo-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <Avatar
                avatarId={user?.avatar || 'gradient-blue'}
                avatarUrl={user?.avatarUrl}
                size="sm"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden md:block max-w-[120px] truncate">
                {user?.displayName || user?.username}
              </span>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 animate-in fade-in zoom-in duration-200">
                  <ProfileDropdown 
                    stats={stats}
                    onClose={() => setMenuOpen(false)}
                    onLogout={handleLogout}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
