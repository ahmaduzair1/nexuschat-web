import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Pin, Search, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { getUser, watchUserChats } from '../services/database';
import { canSeeProfilePhoto } from '../lib/privacy';
import { cn, formatChatTime } from '../lib/utils';

export default function Chats() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { chatId: activeChatId } = useParams();
  const [chats, setChats] = useState([]);
  const [peers, setPeers] = useState({});
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return watchUserChats(user.uid, setChats);
  }, [user]);

  useEffect(() => {
    if (!user || !chats.length) return;
    let cancelled = false;
    async function loadPeers() {
      const map = { ...peers };
      await Promise.all(
        chats.map(async (chat) => {
          if (chat.isGroup) return;
          const otherId = chat.participantIds.find((id) => id !== user.uid);
          if (!otherId || map[otherId]) return;
          const u = await getUser(otherId);
          if (u) map[otherId] = u;
        }),
      );
      if (!cancelled) setPeers(map);
    }
    loadPeers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user]);

  const sorted = useMemo(() => {
    const pinned = chats.filter((c) => c.pinnedBy?.includes(user?.uid));
    const rest = chats.filter((c) => !c.pinnedBy?.includes(user?.uid));
    return [...pinned, ...rest];
  }, [chats, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((chat) => {
      const title = chatTitle(chat, user?.uid, peers).toLowerCase();
      return title.includes(q) || (chat.lastMessage || '').toLowerCase().includes(q);
    });
  }, [sorted, query, peers, user]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-20 border-b border-white/5 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-primary/80">
              Nexus
            </p>
            <h1 className="font-display text-2xl font-bold text-silver-text">Chats</h1>
          </div>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              className="btn-ghost rounded-full p-2"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="New"
            >
              <MessageSquarePlus size={22} className="text-emerald-primary" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="glass-elevated absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl py-1"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/new-chat');
                    }}
                  >
                    <MessageSquarePlus size={16} /> New chat
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/new-group');
                    }}
                  >
                    <Users size={16} /> New group
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-muted" />
          <input
            className="input-field pl-9 py-2.5 text-sm"
            placeholder="Search chats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="rounded-full bg-emerald-subtle p-4">
              <MessageSquarePlus className="text-emerald-primary" size={28} />
            </div>
            <p className="font-medium text-silver-secondary">No chats yet</p>
            <p className="text-sm text-silver-muted">Start a conversation with someone on Nexus.</p>
            <button type="button" className="btn-primary mt-2" onClick={() => navigate('/new-chat')}>
              New chat
            </button>
          </div>
        ) : (
          <ul>
            {filtered.map((chat, i) => {
              const title = chatTitle(chat, user.uid, peers);
              const otherId = chat.participantIds.find((id) => id !== user.uid);
              const peer = otherId ? peers[otherId] : null;
              const avatarSrc = chat.isGroup
                ? chat.avatarUrl
                : canSeeProfilePhoto(peer, user.uid)
                  ? peer?.avatarUrl
                  : '';
              const unread = chat.unreadCounts?.[user.uid] || 0;
              const muted = chat.mutedBy?.includes(user.uid);
              const pinned = chat.pinnedBy?.includes(user.uid);
              const typingOther = Object.entries(chat.typingStatus || {}).some(
                ([id, v]) => id !== user.uid && v,
              );
              const isActive = activeChatId === chat.id;

              return (
                <motion.li
                  key={chat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <NavLink
                    to={`/chats/${chat.id}`}
                    className={cn(
                      'flex items-center gap-3 border-b border-white/[0.03] px-4 py-3 transition',
                      isActive ? 'bg-emerald-subtle/50' : 'hover:bg-white/[0.03]',
                    )}
                  >
                    <Avatar
                      name={title}
                      src={avatarSrc}
                      size={52}
                      online={!chat.isGroup ? peer?.isOnline : undefined}
                      owner={!chat.isGroup ? peer : undefined}
                      viewerId={user.uid}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-silver-text">
                          {pinned && (
                            <Pin size={12} className="mr-1 inline text-gold-accent" />
                          )}
                          {title}
                        </p>
                        <span className="shrink-0 text-[11px] text-silver-muted">
                          {formatChatTime(chat.lastMessageTime)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            typingOther
                              ? 'text-emerald-primary'
                              : unread
                                ? 'text-silver-secondary'
                                : 'text-silver-muted',
                          )}
                        >
                          {typingOther ? 'typing…' : chat.lastMessage || 'Tap to chat'}
                          {muted ? ' · muted' : ''}
                        </p>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-primary px-1.5 text-[11px] font-bold text-navy-bg">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </NavLink>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
      {profile?.name && (
        <p className="sr-only">Signed in as {profile.name}</p>
      )}
    </div>
  );
}

function chatTitle(chat, uid, peers) {
  if (chat.isGroup) return chat.name || 'Group';
  const otherId = chat.participantIds.find((id) => id !== uid);
  return peers[otherId]?.name || 'Chat';
}
