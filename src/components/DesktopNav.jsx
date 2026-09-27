import { NavLink } from 'react-router-dom';
import { MessageCircle, CircleDot, Phone, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { to: '/chats', label: 'Chats', icon: MessageCircle },
  { to: '/status', label: 'Status', icon: CircleDot },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function DesktopNav() {
  const { profile } = useAuth();

  return (
    <aside className="hidden h-full w-[72px] shrink-0 flex-col items-center border-r border-white/5 bg-graphite-surface/90 py-4 lg:flex">
      <div
        className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-primary/30 bg-emerald-subtle shadow-emerald"
        title="Nexus"
      >
        <MessageCircle className="text-emerald-primary" size={22} />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl transition',
                isActive
                  ? 'bg-emerald-subtle text-emerald-primary shadow-emerald'
                  : 'text-silver-muted hover:bg-white/5 hover:text-silver-text',
              )
            }
          >
            {({ isActive }) => (
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
            )}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/settings/profile"
        title={profile?.name || 'Profile'}
        className="mt-auto rounded-full ring-2 ring-transparent transition hover:ring-emerald-primary/40"
      >
        <Avatar name={profile?.name} src={profile?.avatarUrl} size={40} />
      </NavLink>
    </aside>
  );
}
