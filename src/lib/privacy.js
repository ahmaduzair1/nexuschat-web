export function isContactOf(owner, viewerId) {
  return (owner?.contacts || []).includes(viewerId);
}

export function canSeeByRule(rule, owner, viewerId) {
  if (!owner || owner.id === viewerId) return true;
  const mode = rule?.mode || 'everyone';
  switch (mode) {
    case 'everyone':
      return true;
    case 'contacts':
      return isContactOf(owner, viewerId);
    case 'contacts_except':
      return isContactOf(owner, viewerId) && !(rule.exceptIds || []).includes(viewerId);
    case 'only_share_with':
      return (rule.onlyIds || []).includes(viewerId);
    case 'nobody':
    default:
      return false;
  }
}

export function canSeeProfilePhoto(owner, viewerId) {
  return canSeeByRule(owner?.privacy?.profilePhoto, owner, viewerId);
}

export function canSeeLastSeen(owner, viewerId) {
  return canSeeByRule(owner?.privacy?.lastSeen, owner, viewerId);
}

export function canSeeAbout(owner, viewerId) {
  return canSeeByRule(owner?.privacy?.about, owner, viewerId);
}

export function computeAudience(owner, rule) {
  const mode = rule?.mode || 'contacts';
  switch (mode) {
    case 'everyone':
    case 'nobody':
      return [];
    case 'only_share_with':
      return [...(rule.onlyIds || [])];
    case 'contacts_except':
      return (owner.contacts || []).filter((id) => !(rule.exceptIds || []).includes(id));
    case 'contacts':
    default:
      return [...(owner.contacts || [])];
  }
}

export function computeStatusAudience(owner) {
  return computeAudience(owner, owner?.privacy?.status || { mode: 'contacts' });
}

export function privacyLabel(mode) {
  switch (mode) {
    case 'everyone':
      return 'Everyone';
    case 'contacts':
      return 'My contacts';
    case 'contacts_except':
      return 'My contacts except…';
    case 'only_share_with':
      return 'Only share with…';
    case 'nobody':
      return 'Nobody';
    default:
      return 'My contacts';
  }
}

export const DEFAULT_PRIVACY = {
  profilePhoto: { mode: 'everyone', exceptIds: [], onlyIds: [] },
  lastSeen: { mode: 'everyone', exceptIds: [], onlyIds: [] },
  about: { mode: 'everyone', exceptIds: [], onlyIds: [] },
  status: { mode: 'contacts', exceptIds: [], onlyIds: [] },
};
