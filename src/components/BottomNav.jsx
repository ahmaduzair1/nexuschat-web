import { NavLink } from 'react-router-dom';
import { MessageCircle, CircleDot, Phone, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const tabs = [
  { to: '/chats', label: 'Chats', icon: MessageCircle },
  { to: '/status', label: 'Status', icon: CircleDot },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Mobile-only bottom navigation. Hidden on lg+ (desktop uses DesktopNav). */
export default function BottomNav() {
  return (
    <nav className="safe-bottom glass sticky bottom-0 z-40 border-t border-white/5 px-2 pt-2 lg:hidden">
      <div className="mx-auto flex items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-w-[4.5rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition',
                isActive
                  ? 'text-emerald-primary'
                  : 'text-silver-muted hover:text-silver-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={isActive ? 'drop-shadow-[0_0_8px_rgba(0,200,150,0.5)]' : ''}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
