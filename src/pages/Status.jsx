import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImagePlus, Plus, Send, Type, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import ContactPicker from '../components/ContactPicker';
import MediaImage from '../components/MediaImage';
import { compressImageFile } from '../lib/compressImage';
import { computeAudience, privacyLabel } from '../lib/privacy';
import { formatChatTime } from '../lib/utils';
import {
  createStatus,
  getOrCreateDirectChat,
  getUser,
  markStatusViewed,
  sendMessage,
  toggleStatusReaction,
  uploadMediaBytes,
  watchMyStatuses,
  watchVisibleStatuses,
} from '../services/database';

const BG_COLORS = [0xff00c896, 0xff0a0e1a, 0xff1e2436, 0xffffd700, 0xffff4b6e, 0xff448aff];
const PRIVACY_MODES = ['everyone', 'contacts', 'contacts_except', 'only_share_with', 'nobody'];
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '🔥'];
const AUTO_ADVANCE_MS = 5000;

function colorHex(n) {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
}

export default function Status() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [mine, setMine] = useState([]);
  const [others, setOthers] = useState([]);
  const [peers, setPeers] = useState({});
  const [composer, setComposer] = useState(false);
  const [composerTab, setComposerTab] = useState('text'); // text | photo
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null); // { file, url }
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [privacyMode, setPrivacyMode] = useState('contacts');
  const [exceptIds, setExceptIds] = useState([]);
  const [onlyIds, setOnlyIds] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [toast, setToast] = useState('');
  const progressRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    const u1 = watchMyStatuses(user.uid, setMine);
    const u2 = watchVisibleStatuses(user.uid, setOthers);
    return () => {
      u1();
      u2();
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ids = [...new Set(others.map((s) => s.userId))];
      const map = {};
      await Promise.all(
        ids.map(async (id) => {
          const u = await getUser(id);
          if (u) map[id] = u;
        }),
      );
      if (!cancelled) setPeers(map);
    }
    if (others.length) load();
    return () => {
      cancelled = true;
    };
  }, [others]);

  const bundles = useMemo(() => {
    const map = new Map();
    others.forEach((s) => {
      if (!map.has(s.userId)) map.set(s.userId, []);
      map.get(s.userId).push(s);
    });
    return [...map.entries()].map(([userId, items]) => ({
      userId,
      items: items.sort((a, b) => a.createdAt - b.createdAt),
    }));
  }, [others]);

  const mineSorted = useMemo(
    () => [...mine].sort((a, b) => a.createdAt - b.createdAt),
    [mine],
  );

  // Keep viewer items fresh (reactions / viewers) when snapshots update
  useEffect(() => {
    if (!viewer) return;
    const ids = new Set(viewer.items.map((s) => s.id));
    const refreshed = [...mine, ...others].filter((s) => ids.has(s.id));
    if (!refreshed.length) return;
    const byId = Object.fromEntries(refreshed.map((s) => [s.id, s]));
    setViewer((v) => {
      if (!v) return v;
      let changed = false;
      const items = v.items.map((s) => {
        const next = byId[s.id];
        if (!next) return s;
        if (
          next.viewers?.length !== s.viewers?.length ||
          JSON.stringify(next.reactions) !== JSON.stringify(s.reactions)
        ) {
          changed = true;
          return next;
        }
        return s;
      });
      return changed ? { ...v, items } : v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, others]);

  function buildVisibleTo(mode) {
    if (!profile) return [];
    const rule = {
      mode,
      exceptIds,
      onlyIds,
    };
    return computeAudience({ ...profile, id: user.uid }, rule);
  }

  function onPrivacyChange(mode) {
    setPrivacyMode(mode);
    if (mode === 'contacts_except' || mode === 'only_share_with') {
      setShowPicker(true);
    }
  }

  function resetComposer() {
    setComposer(false);
    setComposerTab('text');
    setText('');
    setCaption('');
    if (photoPreview?.url) URL.revokeObjectURL(photoPreview.url);
    setPhotoPreview(null);
    setPrivacyMode(profile?.privacy?.status?.mode || 'contacts');
    setExceptIds(profile?.privacy?.status?.exceptIds || []);
    setOnlyIds(profile?.privacy?.status?.onlyIds || []);
  }

  function onPhotoPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (photoPreview?.url) URL.revokeObjectURL(photoPreview.url);
    setPhotoPreview({ file, url: URL.createObjectURL(file) });
    setComposerTab('photo');
    setComposer(true);
  }

  async function publish() {
    if (!profile || !user) return;
    if (composerTab === 'text' && !text.trim()) return;
    if (composerTab === 'photo' && !photoPreview?.file) return;

    setBusy(true);
    try {
      const visibleTo =
        privacyMode === 'everyone' || privacyMode === 'nobody'
          ? []
          : buildVisibleTo(privacyMode);

      if (composerTab === 'photo') {
        const { blob, mimeType } = await compressImageFile(photoPreview.file, {
          maxWidth: 720,
          maxHeight: 1280,
          quality: 0.72,
          maxBytes: 650 * 1024,
        });
        const buf = await blob.arrayBuffer();
        const mediaUrl = await uploadMediaBytes(new Uint8Array(buf), {
          kind: 'status',
          contentType: mimeType || 'image/jpeg',
          ownerId: user.uid,
        });
        await createStatus({
          userId: user.uid,
          type: 'image',
          mediaUrl,
          text: '',
          caption: caption.trim(),
          privacyMode,
          visibleTo,
          reactions: {},
        });
      } else {
        await createStatus({
          userId: user.uid,
          type: 'text',
          text: text.trim(),
          backgroundColor: bg,
          privacyMode,
          visibleTo,
          reactions: {},
        });
      }
      resetComposer();
    } catch (err) {
      alert(err.message || 'Failed to post status');
    } finally {
      setBusy(false);
    }
  }

  async function openViewer(items, startIndex = 0) {
    const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
    setViewer({ items: sorted, index: startIndex });
    setReplyText('');
    const s = sorted[startIndex];
    if (s && s.userId !== user.uid) {
      markStatusViewed(s.id, user.uid).catch(() => {});
    }
  }

  function goToIndex(next) {
    if (!viewer) return;
    if (next >= viewer.items.length || next < 0) {
      setViewer(null);
      return;
    }
    const s = viewer.items[next];
    if (s.userId !== user.uid) markStatusViewed(s.id, user.uid).catch(() => {});
    setViewer({ ...viewer, index: next });
    setReplyText('');
  }

  function nextStatus() {
    goToIndex((viewer?.index ?? 0) + 1);
  }

  function prevStatus() {
    if (!viewer) return;
    if (viewer.index <= 0) return;
    goToIndex(viewer.index - 1);
  }

  // Auto-advance like WhatsApp
  useEffect(() => {
    if (!viewer) return undefined;
    if (progressRef.current) {
      progressRef.current.style.transition = 'none';
      progressRef.current.style.width = '0%';
    }
    const raf = requestAnimationFrame(() => {
      if (progressRef.current) {
        progressRef.current.style.transition = `width ${AUTO_ADVANCE_MS}ms linear`;
        progressRef.current.style.width = '100%';
      }
    });
    const t = setTimeout(() => nextStatus(), AUTO_ADVANCE_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer?.index, viewer?.items?.[viewer?.index || 0]?.id]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function onReact(emoji) {
    if (!current || !user) return;
    try {
      await toggleStatusReaction(current.id, emoji, user.uid);
    } catch (err) {
      alert(err.message || 'Reaction failed');
    }
  }

  async function sendReply(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!current || !user || !replyText.trim() || current.userId === user.uid) return;
    setReplyBusy(true);
    try {
      const chat = await getOrCreateDirectChat(user.uid, current.userId);
      await sendMessage({
        chatId: chat.id,
        senderId: user.uid,
        senderName: profile?.name || '',
        text: replyText.trim(),
        type: 'text',
        replyToStatusId: current.id,
      });
      setReplyText('');
      showToast('Reply sent');
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setReplyBusy(false);
    }
  }

  const current = viewer?.items?.[viewer.index];
  const isOwn = current && user && current.userId === user.uid;
  const reactionChips = Object.entries(current?.reactions || {}).filter(
    ([, ids]) => Array.isArray(ids) && ids.length > 0,
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-20 border-b border-white/5 px-4 py-4 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-primary/80">Nexus</p>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Status</h1>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto lg:px-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              mineSorted.length ? openViewer(mineSorted) : setComposer(true)
            }
            className="flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-4 text-left hover:bg-white/[0.03] lg:rounded-3xl lg:border lg:border-white/5 lg:bg-graphite-surface/50 lg:px-5"
          >
            <div className="relative">
              <Avatar
                name={profile?.name}
                src={profile?.avatarUrl}
                size={56}
                ring={mineSorted.length > 0}
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-primary text-navy-bg">
                <Plus size={14} />
              </span>
            </div>
            <div>
              <p className="font-semibold">My status</p>
              <p className="text-sm text-silver-muted">
                {mineSorted.length
                  ? `${mineSorted.length} update${mineSorted.length > 1 ? 's' : ''} · ${formatChatTime(mineSorted[mineSorted.length - 1].createdAt)}`
                  : 'Tap to add a status update'}
              </p>
            </div>
          </button>

          <p className="col-span-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-silver-muted lg:pt-4">
            Recent updates
          </p>

          {bundles.length === 0 ? (
            <p className="col-span-full px-4 py-8 text-center text-sm text-silver-muted">
              No statuses from your contacts yet.
            </p>
          ) : (
            bundles.map((b) => {
              const peer = peers[b.userId];
              const unseen = b.items.some((s) => !(s.viewers || []).includes(user.uid));
              return (
                <button
                  key={b.userId}
                  type="button"
                  onClick={() => openViewer(b.items)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] lg:rounded-3xl lg:border lg:border-white/5 lg:bg-graphite-surface/50 lg:px-5 lg:py-4"
                >
                  <Avatar
                    name={peer?.name || 'User'}
                    src={peer?.avatarUrl}
                    size={52}
                    ring={unseen}
                    owner={peer}
                    viewerId={user?.uid}
                  />
                  <div>
                    <p className="font-semibold">{peer?.name || 'User'}</p>
                    <p className="text-sm text-silver-muted">
                      {formatChatTime(b.items[b.items.length - 1].createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="absolute bottom-24 right-4 flex flex-col gap-3 lg:bottom-8 lg:right-8">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-graphite-elevated text-emerald-primary shadow-glass"
          aria-label="Photo status"
        >
          <ImagePlus size={20} />
        </button>
        <button
          type="button"
          onClick={() => {
            setComposerTab('text');
            setComposer(true);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-primary text-navy-bg shadow-emerald"
          aria-label="New status"
        >
          <Camera size={22} />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={onPhotoPick}
      />

      <AnimatePresence>
        {composer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">New status</h2>
                <button type="button" className="btn-ghost p-1" onClick={resetComposer}>
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setComposerTab('text')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold ${
                    composerTab === 'text'
                      ? 'bg-emerald-primary text-navy-bg'
                      : 'bg-graphite-light text-silver-secondary'
                  }`}
                >
                  <Type size={16} /> Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposerTab('photo');
                    if (!photoPreview) fileRef.current?.click();
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold ${
                    composerTab === 'photo'
                      ? 'bg-emerald-primary text-navy-bg'
                      : 'bg-graphite-light text-silver-secondary'
                  }`}
                >
                  <ImagePlus size={16} /> Photo
                </button>
              </div>

              {composerTab === 'text' ? (
                <>
                  <div
                    className="mb-4 flex min-h-[160px] items-center justify-center rounded-2xl p-4 text-center"
                    style={{ backgroundColor: colorHex(bg) }}
                  >
                    <textarea
                      className="w-full resize-none bg-transparent text-center text-xl font-semibold text-white outline-none placeholder:text-white/50"
                      rows={4}
                      placeholder="Type a status…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBg(c)}
                        className={`h-8 w-8 rounded-full border-2 ${bg === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: colorHex(c) }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="mb-4 space-y-3">
                  {photoPreview ? (
                    <img
                      src={photoPreview.url}
                      alt="Preview"
                      className="max-h-56 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 text-silver-muted"
                    >
                      <ImagePlus size={28} />
                      <span className="text-sm">Choose a photo</span>
                    </button>
                  )}
                  <input
                    className="input-field"
                    placeholder="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>
              )}

              <label className="mb-1 block text-xs text-silver-muted">Who can see this status</label>
              <select
                className="input-field mb-2"
                value={privacyMode}
                onChange={(e) => onPrivacyChange(e.target.value)}
              >
                {PRIVACY_MODES.map((m) => (
                  <option key={m} value={m}>
                    {privacyLabel(m)}
                  </option>
                ))}
              </select>
              {(privacyMode === 'contacts_except' || privacyMode === 'only_share_with') && (
                <button
                  type="button"
                  className="mb-4 text-left text-xs font-medium text-emerald-primary hover:underline"
                  onClick={() => setShowPicker(true)}
                >
                  {privacyMode === 'only_share_with'
                    ? `Share with ${(onlyIds || []).length} contact(s) — edit`
                    : `Exclude ${(exceptIds || []).length} contact(s) — edit`}
                </button>
              )}

              <button
                type="button"
                className="btn-primary w-full"
                disabled={
                  busy ||
                  (composerTab === 'text' ? !text.trim() : !photoPreview?.file)
                }
                onClick={publish}
              >
                {busy ? 'Posting…' : 'Post status'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPicker && (
        <ContactPicker
          title={
            privacyMode === 'only_share_with' ? 'Only share with…' : 'My contacts except…'
          }
          contactIds={profile?.contacts || []}
          selectedIds={privacyMode === 'only_share_with' ? onlyIds : exceptIds}
          onChange={(ids) => {
            if (privacyMode === 'only_share_with') setOnlyIds(ids);
            else setExceptIds(ids);
          }}
          onClose={() => setShowPicker(false)}
          viewerId={user?.uid}
        />
      )}

      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-navy-bg"
          >
            <div className="flex gap-1 px-3 pt-3">
              {viewer.items.map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    ref={i === viewer.index ? progressRef : undefined}
                    className={`h-full ${i < viewer.index ? 'bg-white' : i === viewer.index ? 'bg-white' : 'bg-transparent'}`}
                    style={{ width: i < viewer.index ? '100%' : i === viewer.index ? '0%' : '0%' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar
                name={peers[current.userId]?.name || profile?.name}
                src={
                  current.userId === user.uid
                    ? profile?.avatarUrl
                    : peers[current.userId]?.avatarUrl
                }
                size={36}
                owner={current.userId === user.uid ? undefined : peers[current.userId]}
                viewerId={user?.uid}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {current.userId === user.uid
                    ? 'My status'
                    : peers[current.userId]?.name || 'Status'}
                </p>
                <p className="text-xs text-silver-muted">{formatChatTime(current.createdAt)}</p>
              </div>
              <button
                type="button"
                className="btn-ghost p-2"
                onClick={() => setViewer(null)}
              >
                <X size={22} />
              </button>
            </div>

            {/* Tap zones: left = prev, right = next */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="absolute inset-0 z-10 flex">
                <button
                  type="button"
                  className="h-full w-1/3 bg-transparent"
                  aria-label="Previous"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevStatus();
                  }}
                />
                <button
                  type="button"
                  className="h-full flex-1 bg-transparent"
                  aria-label="Next"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextStatus();
                  }}
                />
              </div>

              <div
                className="relative z-0 flex flex-1 flex-col items-center justify-center overflow-hidden"
                style={{
                  backgroundColor:
                    current.type === 'text' ? colorHex(current.backgroundColor) : '#0A0E1A',
                }}
              >
                {current.type === 'image' && current.mediaUrl ? (
                  <>
                    <MediaImage
                      url={current.mediaUrl}
                      alt={current.caption || 'Status'}
                      className="max-h-full max-w-full object-contain"
                    />
                    {current.caption ? (
                      <p className="absolute bottom-4 left-4 right-4 z-20 rounded-xl bg-black/40 px-3 py-2 text-center text-sm text-white">
                        {current.caption}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="px-8 font-display text-2xl font-semibold text-white drop-shadow">
                    {current.text}
                  </p>
                )}
              </div>
            </div>

            {reactionChips.length > 0 && (
              <div className="z-20 flex flex-wrap justify-center gap-2 px-4 pb-2">
                {reactionChips.map(([emoji, ids]) => (
                  <span
                    key={emoji}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-sm"
                  >
                    {emoji} {ids.length}
                  </span>
                ))}
              </div>
            )}

            {isOwn ? (
              <p className="safe-bottom z-20 pb-4 text-center text-sm text-silver-muted">
                Seen by {(current.viewers || []).length}
              </p>
            ) : (
              <div
                className="safe-bottom z-20 space-y-2 px-3 pb-3"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center gap-2">
                  {REACTION_EMOJIS.map((emoji) => {
                    const active = (current.reactions?.[emoji] || []).includes(user.uid);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onReact(emoji)}
                        className={`rounded-full px-2 py-1 text-xl transition ${
                          active ? 'bg-emerald-primary/30 scale-110' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={sendReply} className="flex items-center gap-2">
                  <input
                    className="input-field flex-1 py-2.5 text-sm"
                    placeholder="Reply…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => {
                      // pause auto-advance by remounting timer — clear by bumping key via noop
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-primary !rounded-full !p-3"
                    disabled={replyBusy || !replyText.trim()}
                    aria-label="Send reply"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-graphite-elevated px-4 py-2 text-sm font-medium shadow-glass lg:bottom-10"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <span className="hidden">{String(!!navigate)}</span>
    </div>
  );
}
