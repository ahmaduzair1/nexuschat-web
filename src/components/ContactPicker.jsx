import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import Avatar from './Avatar';
import { getUsersByIds } from '../services/database';

/**
 * Multi-select contact picker for privacy / status audience.
 * @param {{ contactIds: string[], selectedIds: string[], onChange: (ids: string[]) => void, onClose: () => void, title?: string, viewerId?: string }} props
 */
export default function ContactPicker({
  contactIds = [],
  selectedIds = [],
  onChange,
  onClose,
  title = 'Select contacts',
  viewerId,
}) {
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const users = await getUsersByIds(contactIds);
        if (!cancelled) setContacts(users.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      } catch {
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (contactIds.length) load();
    else {
      setContacts([]);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [contactIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q),
    );
  }, [contacts, query]);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  function selectAll() {
    onChange(contacts.map((c) => c.id));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="glass flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" className="btn-ghost p-1" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="relative px-4 pt-3">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-silver-muted" />
          <input
            className="input-field pl-9 py-2.5 text-sm"
            placeholder="Search contacts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 px-4 py-2">
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={selectAll}>
            Select all
          </button>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={clearAll}>
            Clear
          </button>
          <span className="ml-auto self-center text-xs text-silver-muted">
            {selected.size} selected
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-silver-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-silver-muted">
              {contactIds.length ? 'No contacts match.' : 'No contacts yet.'}
            </p>
          ) : (
            <ul>
              {filtered.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/[0.04]"
                    >
                      <Avatar
                        name={c.name}
                        src={c.avatarUrl}
                        size={40}
                        owner={c}
                        viewerId={viewerId}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name || 'User'}</p>
                        <p className="truncate text-xs text-silver-muted">
                          {c.phone || c.email || ''}
                        </p>
                      </div>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          checked
                            ? 'border-emerald-primary bg-emerald-primary text-navy-bg'
                            : 'border-silver-faint'
                        }`}
                      >
                        {checked ? '✓' : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/5 p-4">
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
