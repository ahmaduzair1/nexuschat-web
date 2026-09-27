import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MoreVertical,
  Pin,
  BellOff,
  Bell,
  SendHorizontal,
  PinOff,
  Info,
  X,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import MessageBubble from '../components/MessageBubble';
import {
  getUser,
  markChatRead,
  sendMessage,
  setTyping,
  toggleMute,
  togglePin,
  watchChat,
  watchChatMessages,
} from '../services/database';
import { canSeeLastSeen, canSeeProfilePhoto } from '../lib/privacy';
import { formatLastSeen } from '../lib/utils';

export default function ChatDetail() {
  const { chatId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [peer, setPeer] = useState(null);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    setInfoOpen(false);
    setMenuOpen(false);
    setText('');
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return undefined;
    return watchChat(chatId, setChat);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return undefined;
    return watchChatMessages(chatId, setMessages);
  }, [chatId]);

  useEffect(() => {
    if (!chat || !user || chat.isGroup) {
      setPeer(null);
      return;
    }
    const otherId = chat.participantIds.find((id) => id !== user.uid);
    if (!otherId) return;
    getUser(otherId).then(setPeer);
  }, [chat, user]);

  useEffect(() => {
    if (!chatId || !user) return;
    markChatRead(chatId, user.uid).catch(() => {});
  }, [chatId, user, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const title = chat?.isGroup
    ? chat.name || 'Group'
    : peer?.name || 'Chat';
  const avatarSrc = chat?.isGroup
    ? chat.avatarUrl
    : canSeeProfilePhoto(peer, user?.uid)
      ? peer?.avatarUrl
      : '';
  const subtitle = chat?.isGroup
    ? `${chat.participantIds.length} members`
    : peer?.isOnline
      ? 'online'
      : canSeeLastSeen(peer, user?.uid)
        ? formatLastSeen(peer?.lastSeen)
        : '';
  const someoneTyping = Object.entries(chat?.typingStatus || {}).some(
    ([id, v]) => id !== user?.uid && v,
  );
  const muted = chat?.mutedBy?.includes(user?.uid);
  const pinned = chat?.pinnedBy?.includes(user?.uid);

  async function handleSend(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessage({
        chatId,
        senderId: user.uid,
        text: body,
        senderName: profile?.name || user.displayName || '',
      });
    } catch (err) {
      console.error(err);
      setText(body);
    } finally {
      setSending(false);
    }
  }

  function onChangeText(value) {
    setText(value);
    if (!user || !chatId) return;
    setTyping(chatId, user.uid, true).catch(() => {});
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(chatId, user.uid, false).catch(() => {});
    }, 1200);
  }

  async function onToggleMute() {
    await toggleMute(chatId, user.uid, !muted);
    setMenuOpen(false);
  }

  async function onTogglePin() {
    await togglePin(chatId, user.uid, !pinned);
    setMenuOpen(false);
  }

  if (!chat) {
    return (
      <div className="flex flex-1 items-center justify-center text-silver-muted">Loading chat…</div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_rgba(10,61,46,0.35),_transparent_55%)]">
        <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-white/5 px-2 py-2.5 lg:px-4">
          <button
            type="button"
            className="btn-ghost p-2 lg:hidden"
            onClick={() => navigate('/chats')}
            aria-label="Back to chats"
          >
            <ArrowLeft size={22} />
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => setInfoOpen(true)}
          >
            <Avatar
              name={title}
              src={avatarSrc}
              size={40}
              online={!chat.isGroup ? peer?.isOnline : undefined}
              owner={!chat.isGroup ? peer : undefined}
              viewerId={user?.uid}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{title}</p>
              <p className="truncate text-xs text-emerald-primary/90">
                {someoneTyping ? 'typing…' : subtitle}
              </p>
            </div>
          </button>
          <button
            type="button"
            className="btn-ghost hidden p-2 lg:inline-flex"
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="Contact info"
          >
            <Info size={20} />
          </button>
          <div className="relative">
            <button type="button" className="btn-ghost p-2" onClick={() => setMenuOpen((v) => !v)}>
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="glass-elevated absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-2xl py-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                  onClick={onToggleMute}
                >
                  {muted ? <Bell size={16} /> : <BellOff size={16} />}
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                  onClick={onTogglePin}
                >
                  {pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  {pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5 lg:hidden"
                  onClick={() => {
                    setMenuOpen(false);
                    setInfoOpen(true);
                  }}
                >
                  <Info size={16} /> Info
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3 lg:px-6">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isMine={m.senderId === user.uid}
              showSender={chat.isGroup}
              participants={chat.participantIds}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="safe-bottom glass border-t border-white/5 px-3 pt-2 lg:px-4"
        >
          <div className="mb-2 flex items-end gap-2">
            <input
              className="input-field flex-1 py-3"
              placeholder="Message"
              value={text}
              onChange={(e) => onChangeText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-primary text-navy-bg shadow-emerald disabled:opacity-40"
            >
              <SendHorizontal size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Desktop right info panel */}
      {infoOpen && (
        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-white/5 bg-graphite-surface/60 xl:flex">
            <ContactInfo
              title={title}
              avatarSrc={avatarSrc}
              subtitle={subtitle}
              chat={chat}
              peer={peer}
              viewerId={user?.uid}
              onClose={() => setInfoOpen(false)}
            />
          </aside>
        )}

      {/* Mobile / tablet info overlay */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 xl:hidden">
          <div className="flex h-full w-full max-w-sm flex-col bg-graphite-surface shadow-glass">
            <ContactInfo
              title={title}
              avatarSrc={avatarSrc}
              subtitle={subtitle}
              chat={chat}
              peer={peer}
              viewerId={user?.uid}
              onClose={() => setInfoOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ContactInfo({ title, avatarSrc, subtitle, chat, peer, onClose, viewerId }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <p className="font-semibold">Contact info</p>
        <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8 text-center">
        <Avatar
          name={title}
          src={avatarSrc}
          size={96}
          online={!chat.isGroup ? peer?.isOnline : undefined}
          owner={!chat.isGroup ? peer : undefined}
          viewerId={viewerId}
        />
        <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
        <p className="mt-1 text-sm text-silver-muted">{subtitle || '—'}</p>
        {chat.isGroup ? (
          <div className="mt-6 flex w-full items-center gap-2 rounded-2xl bg-graphite-light/60 px-4 py-3 text-left">
            <Users size={18} className="text-emerald-primary" />
            <div>
              <p className="text-sm font-medium">{chat.participantIds.length} members</p>
              <p className="text-xs text-silver-muted">Group chat</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 w-full space-y-2 text-left">
            {peer?.about && (
              <div className="rounded-2xl bg-graphite-light/60 px-4 py-3">
                <p className="text-xs text-silver-muted">About</p>
                <p className="text-sm">{peer.about}</p>
              </div>
            )}
            {peer?.email && (
              <div className="rounded-2xl bg-graphite-light/60 px-4 py-3">
                <p className="text-xs text-silver-muted">Email</p>
                <p className="truncate text-sm">{peer.email}</p>
              </div>
            )}
            {peer?.phone && (
              <div className="rounded-2xl bg-graphite-light/60 px-4 py-3">
                <p className="text-xs text-silver-muted">Phone</p>
                <p className="text-sm">{peer.phone}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
