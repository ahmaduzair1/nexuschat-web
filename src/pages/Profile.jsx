import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { mediaIdFromUrl } from '../lib/media';
import { removeProfilePhoto, updateProfile, uploadAvatar } from '../services/database';

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [saved, setSaved] = useState(false);
  const [localAvatar, setLocalAvatar] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setAbout(profile.about || '');
    setPhone(profile.phone || '');
    setEmail(profile.email || '');
    setLocalAvatar(profile.avatarUrl || '');
  }, [profile]);

  const hasCustomPhoto = useMemo(() => {
    const url = localAvatar || profile?.avatarUrl || '';
    return Boolean(mediaIdFromUrl(url));
  }, [localAvatar, profile?.avatarUrl]);

  async function onSave(e) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setSaved(false);
    try {
      await updateProfile(user.uid, { name, about, phone, email });
      setSaved(true);
    } catch (err) {
      alert(err.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onAvatarPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name || '')) {
      setAvatarError('Please choose an image file');
      return;
    }
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateProfile(user.uid, { avatarUrl: url });
      setLocalAvatar(url);
    } catch (err) {
      const msg =
        err?.code === 'permission-denied' || /insufficient permissions/i.test(err?.message || '')
          ? 'Permission denied. Firestore rules must allow media + profile updates.'
          : err.message || 'Upload failed';
      setAvatarError(msg);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onRemovePhoto() {
    if (!user || !hasCustomPhoto) return;
    const ok = window.confirm('Remove your profile photo?');
    if (!ok) return;
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const fallback = await removeProfilePhoto(user.uid, name);
      setLocalAvatar(fallback);
    } catch (err) {
      setAvatarError(err.message || 'Could not remove photo');
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-white/5 px-2 py-3">
        <button type="button" className="btn-ghost p-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-bold">Profile</h1>
      </header>

      <form onSubmit={onSave} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="relative"
            onClick={() => fileRef.current?.click()}
            disabled={avatarBusy}
            aria-label="Change profile photo"
          >
            <Avatar name={name} src={localAvatar || profile?.avatarUrl} size={96} />
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-primary text-navy-bg shadow-emerald">
              {avatarBusy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={onAvatarPick}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn-ghost text-sm text-emerald-primary"
              disabled={avatarBusy}
              onClick={() => fileRef.current?.click()}
            >
              Change photo
            </button>
            {hasCustomPhoto && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-error-red hover:bg-error-red/10 disabled:opacity-50"
                disabled={avatarBusy}
                onClick={onRemovePhoto}
              >
                <Trash2 size={15} />
                Remove photo
              </button>
            )}
          </div>
          {avatarBusy && <p className="text-xs text-silver-muted">Updating photo…</p>}
          {avatarError && <p className="text-xs text-error-red">{avatarError}</p>}
        </div>
        <Field label="Name" value={name} onChange={setName} required />
        <Field label="About" value={about} onChange={setAbout} />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
        {saved && <p className="text-center text-sm text-emerald-primary">Saved</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || avatarBusy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-silver-muted">{label}</label>
      <input
        className="input-field"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
