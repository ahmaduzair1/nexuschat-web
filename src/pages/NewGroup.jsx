import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { createGroupChat, searchUsers } from '../services/database';
import { cn } from '../lib/utils';

export default function NewGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSearch(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResults(await searchUsers(query, user.uid));
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  function toggle(u) {
    setSelected((prev) =>
      prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u],
    );
  }

  async function create() {
    if (!name.trim() || selected.length === 0) {
      setError('Group name and at least one member are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const chat = await createGroupChat({
        creatorId: user.uid,
        name: name.trim(),
        memberIds: selected.map((u) => u.id),
      });
      navigate(`/chats/${chat.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create group');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col lg:max-w-4xl">
      <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-white/5 px-2 py-3 lg:px-4">
        <button type="button" className="btn-ghost p-2" onClick={() => navigate('/chats')}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-bold">New group</h1>
      </header>

      <div className="space-y-3 px-4 py-4 lg:px-6">
        <input
          className="input-field"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <form onSubmit={onSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-muted" />
            <input
              className="input-field pl-9"
              placeholder="Add members"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary px-4" disabled={busy}>
            Find
          </button>
        </form>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u)}
                className="rounded-full bg-emerald-subtle px-3 py-1 text-xs text-emerald-glow"
              >
                {u.name} ×
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-error-red">{error}</p>}
        <button type="button" className="btn-primary w-full" disabled={busy} onClick={create}>
          Create group
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {results.map((u) => {
          const on = selected.some((x) => x.id === u.id);
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => toggle(u)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-white/[0.04]"
              >
                <Avatar name={u.name} src={u.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="truncate text-sm text-silver-muted">{u.email || u.phone}</p>
                </div>
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border',
                    on
                      ? 'border-emerald-primary bg-emerald-primary text-navy-bg'
                      : 'border-silver-faint',
                  )}
                >
                  {on && <Check size={14} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
