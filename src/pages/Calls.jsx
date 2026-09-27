import { useEffect, useState } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { getUser, watchCalls } from '../services/database';
import { formatCallDuration, formatChatTime } from '../lib/utils';

export default function Calls() {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [peers, setPeers] = useState({});

  useEffect(() => {
    if (!user) return undefined;
    return watchCalls(user.uid, setCalls);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ids = new Set();
      calls.forEach((c) => {
        c.participantIds.forEach((id) => {
          if (id !== user.uid) ids.add(id);
        });
      });
      const map = {};
      await Promise.all(
        [...ids].map(async (id) => {
          const u = await getUser(id);
          if (u) map[id] = u;
        }),
      );
      if (!cancelled) setPeers(map);
    }
    if (calls.length) load();
    return () => {
      cancelled = true;
    };
  }, [calls, user]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-20 border-b border-white/5 px-4 py-4 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-primary/80">Nexus</p>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Calls</h1>
        <p className="mt-1 text-xs text-silver-muted">
          History from Firestore · live Zego calls stay in the mobile app
        </p>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto lg:px-6 lg:py-8">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <div className="rounded-full bg-graphite-light p-4">
              <Phone className="text-silver-muted" size={28} />
            </div>
            <p className="font-medium text-silver-secondary">No call history</p>
            <p className="text-sm text-silver-muted">
              Voice and video calls placed from the Flutter app will appear here.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {calls.map((call) => {
              const otherId =
                call.participantIds.find((id) => id !== user.uid) || call.callerId;
              const peer = peers[otherId];
              const incoming = call.callerId !== user.uid;
              const missed = call.status === 'missed' || call.status === 'declined';
              const Icon = missed
                ? PhoneMissed
                : incoming
                  ? PhoneIncoming
                  : PhoneOutgoing;
              const duration = formatCallDuration(call.startedAt, call.endedAt);

              return (
                <li
                  key={call.id}
                  className="flex items-center gap-3 border-b border-white/[0.03] px-4 py-3 lg:rounded-3xl lg:border lg:border-white/5 lg:bg-graphite-surface/50 lg:px-5 lg:py-4"
                >
                  <Avatar name={peer?.name || 'User'} src={peer?.avatarUrl} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{peer?.name || 'Unknown'}</p>
                    <p
                      className={`flex items-center gap-1.5 text-sm ${
                        missed ? 'text-error-red' : 'text-silver-muted'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="capitalize">{call.status}</span>
                      {duration ? ` · ${duration}` : ''}
                      {' · '}
                      {formatChatTime(call.startedAt)}
                    </p>
                  </div>
                  {call.kind === 'video' ? (
                    <Video size={18} className="text-emerald-primary" />
                  ) : (
                    <Phone size={18} className="text-emerald-primary" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
