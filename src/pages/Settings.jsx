import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  LogOut,
  Shield,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { setNotificationsEnabled } from '../services/database';

export default function Settings() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();

  async function toggleNotifs() {
    if (!user || !profile) return;
    await setNotificationsEnabled(user.uid, !profile.notificationsEnabled);
  }

  async function onSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-20 border-b border-white/5 px-4 py-4 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-primary/80">Nexus</p>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-8">
        <Link
          to="/settings/profile"
          className="glass mb-6 flex items-center gap-4 rounded-3xl p-4 transition hover:bg-white/[0.03] lg:p-6"
        >
          <Avatar name={profile?.name} src={profile?.avatarUrl} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold">{profile?.name || 'You'}</p>
            <p className="truncate text-sm text-silver-muted">
              {profile?.about || 'Hey there! I am using Nexus.'}
            </p>
          </div>
          <ChevronRight className="text-silver-muted" size={20} />
        </Link>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass overflow-hidden rounded-3xl">
            <Row
              icon={UserRound}
              title="Profile"
              subtitle="Name, about, phone"
              to="/settings/profile"
            />
            <Row
              icon={Shield}
              title="Privacy"
              subtitle="Last seen, photo, status"
              to="/settings/privacy"
            />
          </div>
          <div className="glass overflow-hidden rounded-3xl">
            <button
              type="button"
              onClick={toggleNotifs}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-subtle text-emerald-primary">
                <Bell size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-silver-muted">
                  {profile?.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <span
                className={`relative h-6 w-11 rounded-full transition ${
                  profile?.notificationsEnabled ? 'bg-emerald-primary' : 'bg-silver-faint'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    profile?.notificationsEnabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-error-red/30 bg-error-red/10 py-3.5 font-semibold text-error-red transition hover:bg-error-red/20"
        >
          <LogOut size={18} />
          Sign out
        </button>

        <p className="mt-6 text-center text-[11px] text-silver-faint lg:text-left">
          Firebase project · nexus-chat-1705c
        </p>
      </div>
    </div>
  );
}

function Row({ icon: Icon, title, subtitle, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-t border-white/[0.04] px-4 py-3.5 first:border-t-0 hover:bg-white/[0.03]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-subtle text-emerald-primary">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-silver-muted">{subtitle}</p>
      </div>
      <ChevronRight className="text-silver-muted" size={18} />
    </Link>
  );
}
