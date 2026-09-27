import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { getOrCreateDirectChat, searchUsers } from '../services/database';

export default function NewChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSearch(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    setSearched(true);
    try {
      const users = await searchUsers(query, user.uid);
      setResults(users);
    } catch (err) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  async function startChat(other) {
    setBusy(true);
    try {
      const chat = await getOrCreateDirectChat(user.uid, other.id);
      navigate(`/chats/${chat.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not start chat');
      setBusy(false);
    }
  }

  const inviteHint =
    searched && results.length === 0 && query.trim()
      ? `No Nexus user found for “${query.trim()}”. Invite them to join Nexus Chat.`
      : null;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col lg:max-w-4xl">
      <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-white/5 px-2 py-3 lg:rounded-b-none lg:px-4">
        <button type="button" className="btn-ghost p-2" onClick={() => navigate('/chats')}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-bold">New chat</h1>
      </header>

      <form onSubmit={onSearch} className="space-y-3 px-4 py-4 lg:px-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-muted" />
          <input
            className="input-field pl-9"
            placeholder="Email, phone, or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Searching…' : 'Search'}
        </button>
        <div className="flex flex-wrap gap-2 text-[11px] text-silver-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-graphite-light px-2 py-1">
            <Mail size={12} /> exact email
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-graphite-light px-2 py-1">
            <Phone size={12} /> phoneLast10
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-graphite-light px-2 py-1">
            name prefix
          </span>
        </div>
      </form>

      {error && (
        <p className="mx-4 rounded-2xl border border-error-red/30 bg-error-red/10 px-3 py-2 text-sm text-error-red">
          {error}
        </p>
      )}

      {inviteHint && (
        <div className="mx-4 flex items-start gap-3 rounded-2xl border border-gold-accent/20 bg-gold-accent/5 p-4">
          <UserPlus className="mt-0.5 shrink-0 text-gold-accent" size={20} />
          <div>
            <p className="text-sm font-medium text-silver-text">Invite to Nexus</p>
            <p className="mt-1 text-sm text-silver-muted">{inviteHint}</p>
          </div>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {results.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => startChat(u)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-white/[0.04]"
            >
              <Avatar name={u.name} src={u.avatarUrl} size={48} online={u.isOnline} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.name}</p>
                <p className="truncate text-sm text-silver-muted">
                  {u.email || u.phone || u.about}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
