import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ContactPicker from '../components/ContactPicker';
import { DEFAULT_PRIVACY, privacyLabel } from '../lib/privacy';
import { refreshActiveStatusAudience, updatePrivacy } from '../services/database';

const MODES = ['everyone', 'contacts', 'contacts_except', 'only_share_with', 'nobody'];
const FIELDS = [
  { key: 'lastSeen', label: 'Last seen & online' },
  { key: 'profilePhoto', label: 'Profile photo' },
  { key: 'about', label: 'About' },
  { key: 'status', label: 'Status' },
];

function normalizeRule(rule) {
  return {
    mode: rule?.mode || 'everyone',
    exceptIds: Array.isArray(rule?.exceptIds) ? rule.exceptIds : [],
    onlyIds: Array.isArray(rule?.onlyIds) ? rule.onlyIds : [],
  };
}

export default function Privacy() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [busy, setBusy] = useState(false);
  const [pickerField, setPickerField] = useState(null);

  const contactIds = useMemo(() => profile?.contacts || [], [profile]);

  useEffect(() => {
    if (!profile?.privacy) return;
    setPrivacy({
      profilePhoto: normalizeRule(profile.privacy.profilePhoto || DEFAULT_PRIVACY.profilePhoto),
      lastSeen: normalizeRule(profile.privacy.lastSeen || DEFAULT_PRIVACY.lastSeen),
      about: normalizeRule(profile.privacy.about || DEFAULT_PRIVACY.about),
      status: normalizeRule(profile.privacy.status || DEFAULT_PRIVACY.status),
    });
  }, [profile]);

  function setMode(key, mode) {
    setPrivacy((prev) => {
      const next = {
        ...prev,
        [key]: { ...(prev[key] || DEFAULT_PRIVACY[key]), mode },
      };
      if (mode === 'contacts_except' || mode === 'only_share_with') {
        setPickerField(key);
      }
      return next;
    });
  }

  function setPickerIds(ids) {
    if (!pickerField) return;
    setPrivacy((prev) => {
      const rule = { ...(prev[pickerField] || DEFAULT_PRIVACY[pickerField]) };
      if (rule.mode === 'only_share_with') rule.onlyIds = ids;
      else rule.exceptIds = ids;
      return { ...prev, [pickerField]: rule };
    });
  }

  function pickerSelectedIds() {
    if (!pickerField) return [];
    const rule = privacy[pickerField];
    if (rule?.mode === 'only_share_with') return rule.onlyIds || [];
    return rule?.exceptIds || [];
  }

  function audienceHint(rule) {
    if (rule.mode === 'contacts_except') {
      const n = (rule.exceptIds || []).length;
      return n ? `Excluding ${n} contact${n === 1 ? '' : 's'}` : 'Tap to choose who to exclude';
    }
    if (rule.mode === 'only_share_with') {
      const n = (rule.onlyIds || []).length;
      return n ? `Sharing with ${n} contact${n === 1 ? '' : 's'}` : 'Tap to choose who can see';
    }
    return null;
  }

  async function onSave() {
    if (!user || !profile) return;
    setBusy(true);
    try {
      await updatePrivacy(user.uid, privacy);
      const owner = { ...profile, id: user.uid, privacy };
      await refreshActiveStatusAudience(owner);
      navigate(-1);
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-white/5 px-2 py-3">
        <button type="button" className="btn-ghost p-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-bold">Privacy</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {FIELDS.map(({ key, label }) => {
          const rule = privacy[key] || DEFAULT_PRIVACY[key];
          const hint = audienceHint(rule);
          return (
            <div key={key} className="glass rounded-2xl p-4">
              <p className="mb-2 font-medium">{label}</p>
              <p className="mb-3 text-xs text-silver-muted">
                Current: {privacyLabel(rule.mode)}
              </p>
              <div className="flex flex-wrap gap-2">
                {MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMode(key, mode)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      rule.mode === mode
                        ? 'bg-emerald-primary text-navy-bg'
                        : 'bg-graphite-light text-silver-secondary hover:text-silver-text'
                    }`}
                  >
                    {privacyLabel(mode)}
                  </button>
                ))}
              </div>
              {hint && (
                <button
                  type="button"
                  className="mt-3 text-left text-xs font-medium text-emerald-primary hover:underline"
                  onClick={() => setPickerField(key)}
                >
                  {hint}
                </button>
              )}
            </div>
          );
        })}
        <button type="button" className="btn-primary w-full" disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : 'Save privacy'}
        </button>
      </div>

      {pickerField && (
        <ContactPicker
          title={
            privacy[pickerField]?.mode === 'only_share_with'
              ? 'Only share with…'
              : 'My contacts except…'
          }
          contactIds={contactIds}
          selectedIds={pickerSelectedIds()}
          onChange={setPickerIds}
          onClose={() => setPickerField(null)}
          viewerId={user?.uid}
        />
      )}
    </div>
  );
}
