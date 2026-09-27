import {
  Bytes,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_PRIVACY, computeAudience, computeStatusAudience } from '../lib/privacy';
import { compressImageFile } from '../lib/compressImage';
import {
  defaultAvatarUrl,
  digitsOnly,
  directChatId,
  normalizeSearch,
  pairKey,
  phoneMatchKey,
  toDate,
  uid,
} from '../lib/utils';
import {
  mediaUrlFor,
  mediaIdFromUrl,
  getCachedMedia,
  setCachedMedia,
  isRemoteHttpUrl,
} from '../lib/media';

const usersCol = () => collection(db, 'users');
const chatsCol = () => collection(db, 'chats');
const statusesCol = () => collection(db, 'statuses');
const callsCol = () => collection(db, 'calls');
const mediaCol = () => collection(db, 'media');

function parseUser(id, data = {}) {
  return {
    id,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    avatarUrl: data.avatarUrl || '',
    about: data.about || 'Hey there! I am using Nexus.',
    isOnline: !!data.isOnline,
    statusText: data.statusText || null,
    lastSeen: toDate(data.lastSeen),
    privacy: {
      profilePhoto: data.privacy?.profilePhoto || DEFAULT_PRIVACY.profilePhoto,
      lastSeen: data.privacy?.lastSeen || DEFAULT_PRIVACY.lastSeen,
      about: data.privacy?.about || DEFAULT_PRIVACY.about,
      status: data.privacy?.status || DEFAULT_PRIVACY.status,
    },
    contacts: data.contacts || [],
    fcmTokens: data.fcmTokens || [],
    notificationsEnabled: data.notificationsEnabled !== false,
    searchName: data.searchName || (data.name || '').toLowerCase(),
    phoneDigits: data.phoneDigits || '',
    phoneLast10: data.phoneLast10 || '',
  };
}

function parseChat(id, data = {}) {
  const unreadCounts = {};
  Object.entries(data.unreadCounts || {}).forEach(([k, v]) => {
    unreadCounts[k] = Number(v) || 0;
  });
  return {
    id,
    type: data.type === 'group' ? 'group' : 'direct',
    participantIds: data.participantIds || [],
    admins: data.admins || [],
    name: data.name || '',
    avatarUrl: data.avatarUrl || '',
    lastMessage: data.lastMessage || '',
    lastMessageSenderId: data.lastMessageSenderId || '',
    lastMessageTime: toDate(data.lastMessageTime) || new Date(0),
    unreadCounts,
    typingStatus: data.typingStatus || {},
    mutedBy: data.mutedBy || [],
    pinnedBy: data.pinnedBy || [],
    createdBy: data.createdBy || '',
    pairKey: data.pairKey || '',
    isGroup: data.type === 'group',
  };
}

function parseMessage(id, data = {}) {
  const readBy = {};
  Object.entries(data.readBy || {}).forEach(([k, v]) => {
    const d = toDate(v);
    if (d) readBy[k] = d;
  });
  const reactions = {};
  Object.entries(data.reactions || {}).forEach(([k, v]) => {
    reactions[k] = Array.isArray(v) ? v : [];
  });
  return {
    id,
    senderId: data.senderId || '',
    senderName: data.senderName || '',
    text: data.text || '',
    type: data.type || 'text',
    mediaUrl: data.mediaUrl || null,
    timestamp: toDate(data.timestamp) || new Date(),
    readBy,
    replyToMessageId: data.replyToMessageId || null,
    replyToStatusId: data.replyToStatusId || null,
    reactions,
  };
}

function parseStatus(id, data = {}) {
  const reactions = {};
  Object.entries(data.reactions || {}).forEach(([emoji, ids]) => {
    reactions[emoji] = Array.isArray(ids) ? ids : [];
  });
  return {
    id,
    userId: data.userId || '',
    type: data.type === 'text' ? 'text' : 'image',
    mediaUrl: data.mediaUrl || null,
    text: data.text || '',
    backgroundColor: data.backgroundColor ?? 0xff00c896,
    caption: data.caption || '',
    createdAt: toDate(data.createdAt) || new Date(),
    expiresAt: toDate(data.expiresAt) || new Date(Date.now() + 24 * 60 * 60 * 1000),
    privacyMode: data.privacyMode || 'contacts',
    visibleTo: data.visibleTo || [],
    viewers: data.viewers || [],
    reactions,
  };
}

function parseCall(id, data = {}) {
  return {
    id,
    callerId: data.callerId || '',
    participantIds: data.participantIds || [],
    kind: data.kind === 'video' ? 'video' : 'voice',
    status: data.status || 'completed',
    isGroup: !!data.isGroup,
    chatId: data.chatId || '',
    startedAt: toDate(data.startedAt) || new Date(),
    endedAt: toDate(data.endedAt),
    zegoCallId: data.zegoCallId || '',
  };
}

export async function createUserDocument({ uid: userId, name, email = '', phone = '' }) {
  const ref = doc(usersCol(), userId);
  const existing = await getDoc(ref);
  const avatar = defaultAvatarUrl(name);

  if (existing.exists()) {
    const updates = {
      name,
      searchName: normalizeSearch(name),
      isOnline: true,
      lastSeen: serverTimestamp(),
    };
    if (email) updates.email = email.toLowerCase();
    if (phone) {
      updates.phone = phone;
      updates.phoneDigits = digitsOnly(phone);
      updates.phoneLast10 = phoneMatchKey(phone);
    }
    await setDoc(ref, updates, { merge: true });
    return;
  }

  await setDoc(ref, {
    name,
    email: (email || '').toLowerCase(),
    phone: phone || '',
    avatarUrl: avatar,
    about: 'Hey there! I am using Nexus.',
    isOnline: true,
    lastSeen: serverTimestamp(),
    privacy: DEFAULT_PRIVACY,
    contacts: [],
    fcmTokens: [],
    notificationsEnabled: true,
    searchName: normalizeSearch(name),
    ...(phone
      ? { phoneDigits: digitsOnly(phone), phoneLast10: phoneMatchKey(phone) }
      : {}),
    createdAt: serverTimestamp(),
  });
}

export function watchUser(userId, cb, onError) {
  return onSnapshot(
    doc(usersCol(), userId),
    (snap) => {
      cb(snap.exists() ? parseUser(snap.id, snap.data()) : null);
    },
    (err) => {
      console.error('[watchUser]', err);
      cb(null);
      if (typeof onError === 'function') onError(err);
    },
  );
}

export async function getUser(userId) {
  const snap = await getDoc(doc(usersCol(), userId));
  return snap.exists() ? parseUser(snap.id, snap.data()) : null;
}

export async function updateUserStatus(userId, isOnline) {
  await setDoc(
    doc(usersCol(), userId),
    { isOnline, lastSeen: serverTimestamp() },
    { merge: true },
  );
}

export async function updateProfile(userId, { name, about, avatarUrl, email, phone }) {
  // Rules require name + avatarUrl strings on every user update — merge from existing doc.
  const ref = doc(usersCol(), userId);
  const existing = await getDoc(ref);
  const prev = existing.exists() ? existing.data() : {};
  const nextName = (name != null ? name : prev.name || '').toString().trim() || 'Nexus user';
  const nextAvatar =
    avatarUrl != null
      ? String(avatarUrl)
      : String(prev.avatarUrl || defaultAvatarUrl(nextName));

  const data = {
    name: nextName,
    searchName: normalizeSearch(nextName),
    avatarUrl: nextAvatar,
  };
  if (about != null) data.about = about;
  if (email != null) data.email = email.toLowerCase();
  if (phone != null) {
    data.phone = phone;
    data.phoneDigits = digitsOnly(phone);
    data.phoneLast10 = phoneMatchKey(phone);
  }
  await setDoc(ref, data, { merge: true });
}

export async function updatePrivacy(userId, privacy) {
  const ref = doc(usersCol(), userId);
  const existing = await getDoc(ref);
  const prev = existing.exists() ? existing.data() : {};
  const nextName = (prev.name || 'Nexus user').toString();
  await setDoc(
    ref,
    {
      privacy,
      // Keep required fields so isValidUser still passes after merge.
      name: nextName,
      searchName: normalizeSearch(nextName),
      avatarUrl: String(prev.avatarUrl || defaultAvatarUrl(nextName)),
    },
    { merge: true },
  );
}

/** Recompute visibleTo on the owner's still-active statuses after privacy changes. */
export async function refreshActiveStatusAudience(owner) {
  if (!owner?.id) return;
  const snap = await getDocs(query(statusesCol(), where('userId', '==', owner.id)));
  const now = new Date();
  const batch = writeBatch(db);
  let writes = 0;
  const statusRule = owner.privacy?.status || DEFAULT_PRIVACY.status;
  const mode = statusRule.mode || 'contacts';
  const visibleTo = computeAudience(owner, statusRule);

  for (const d of snap.docs) {
    const s = parseStatus(d.id, d.data());
    if (!(s.expiresAt > now)) continue;
    batch.update(d.ref, {
      privacyMode: mode,
      visibleTo: mode === 'everyone' || mode === 'nobody' ? [] : visibleTo,
    });
    writes += 1;
    if (writes >= 40) break;
  }
  if (writes > 0) await batch.commit();
}

export async function setNotificationsEnabled(userId, enabled) {
  await setDoc(doc(usersCol(), userId), { notificationsEnabled: enabled }, { merge: true });
}

export async function addContact(userId, contactId) {
  if (!userId || !contactId || userId === contactId) return;
  await setDoc(
    doc(usersCol(), userId),
    { contacts: arrayUnion(contactId) },
    { merge: true },
  );
}

export async function linkContacts(me, userIds) {
  const others = [...new Set(userIds)].filter((id) => id && id !== me);
  if (!others.length) return;
  await setDoc(doc(usersCol(), me), { contacts: arrayUnion(...others) }, { merge: true });
  await Promise.all(others.map((other) => addContact(other, me)));
}

export async function searchUsers(rawQuery, currentUid) {
  const q = (rawQuery || '').trim();
  const results = new Map();

  const addSnap = (snap) => {
    snap.docs.forEach((d) => {
      if (d.id === currentUid) return;
      results.set(d.id, parseUser(d.id, d.data()));
    });
  };

  if (!q) {
    try {
      addSnap(await getDocs(query(usersCol(), orderBy('searchName'), limit(40))));
    } catch {
      addSnap(await getDocs(query(usersCol(), limit(40))));
    }
    return [...results.values()];
  }

  const looksLikeEmail = q.includes('@');
  const digits = digitsOnly(q);
  const looksLikePhone = digits.length >= 7;

  if (looksLikeEmail) {
    addSnap(await getDocs(query(usersCol(), where('email', '==', q.toLowerCase()), limit(5))));
  }

  if (looksLikePhone) {
    addSnap(await getDocs(query(usersCol(), where('phoneDigits', '==', digits), limit(5))));
    addSnap(
      await getDocs(query(usersCol(), where('phoneLast10', '==', phoneMatchKey(q)), limit(5))),
    );
    addSnap(await getDocs(query(usersCol(), where('phone', '==', q), limit(5))));
  }

  if (!looksLikeEmail && !looksLikePhone) {
    const nameKey = normalizeSearch(q);
    addSnap(
      await getDocs(
        query(
          usersCol(),
          where('searchName', '>=', nameKey),
          where('searchName', '<=', `${nameKey}\uf8ff`),
          limit(20),
        ),
      ),
    );
  }

  return [...results.values()];
}

export function watchUserChats(userId, cb) {
  const q = query(chatsCol(), where('participantIds', 'array-contains', userId));
  return onSnapshot(q, (snap) => {
    const chats = snap.docs
      .map((d) => parseChat(d.id, d.data()))
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    cb(chats);
  });
}

export function watchChat(chatId, cb) {
  return onSnapshot(doc(chatsCol(), chatId), (snap) => {
    cb(snap.exists() ? parseChat(snap.id, snap.data()) : null);
  });
}

export async function getOrCreateDirectChat(currentUid, otherUid) {
  const id = directChatId(currentUid, otherUid);
  const ref = doc(chatsCol(), id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await addContact(currentUid, otherUid);
    await addContact(otherUid, currentUid);
    return parseChat(existing.id, existing.data());
  }

  const chat = {
    type: 'direct',
    participantIds: [currentUid, otherUid],
    admins: [],
    name: '',
    avatarUrl: '',
    lastMessage: '',
    lastMessageSenderId: '',
    lastMessageTime: serverTimestamp(),
    unreadCounts: { [currentUid]: 0, [otherUid]: 0 },
    typingStatus: { [currentUid]: false, [otherUid]: false },
    mutedBy: [],
    pinnedBy: [],
    createdBy: currentUid,
    pairKey: pairKey(currentUid, otherUid),
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, chat);
  await addContact(currentUid, otherUid);
  await addContact(otherUid, currentUid);
  return { ...chat, id, lastMessageTime: new Date(), isGroup: false };
}

export async function createGroupChat({ creatorId, name, memberIds, avatarUrl = '' }) {
  const participants = [...new Set([creatorId, ...memberIds])];
  const unread = Object.fromEntries(participants.map((id) => [id, 0]));
  const typing = Object.fromEntries(participants.map((id) => [id, false]));
  const ref = doc(chatsCol());
  await setDoc(ref, {
    type: 'group',
    participantIds: participants,
    admins: [creatorId],
    name,
    avatarUrl,
    lastMessage: 'Group created',
    lastMessageSenderId: creatorId,
    lastMessageTime: serverTimestamp(),
    unreadCounts: unread,
    typingStatus: typing,
    mutedBy: [],
    pinnedBy: [],
    createdBy: creatorId,
    pairKey: '',
    createdAt: serverTimestamp(),
  });
  await sendMessage({
    chatId: ref.id,
    senderId: creatorId,
    text: 'Group created',
    type: 'system',
    senderName: name,
  });
  await linkContacts(creatorId, participants);
  return parseChat(ref.id, {
    type: 'group',
    participantIds: participants,
    admins: [creatorId],
    name,
    avatarUrl,
    lastMessage: 'Group created',
    lastMessageSenderId: creatorId,
    lastMessageTime: new Date(),
    unreadCounts: unread,
    typingStatus: typing,
    createdBy: creatorId,
  });
}

export function watchChatMessages(chatId, cb) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(200),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => parseMessage(d.id, d.data())));
  });
}

export async function sendMessage({
  chatId,
  senderId,
  text,
  type = 'text',
  mediaUrl = null,
  senderName = '',
  replyToMessageId = null,
  replyToStatusId = null,
}) {
  const chatRef = doc(chatsCol(), chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return;
  const chat = parseChat(chatSnap.id, chatSnap.data());

  const preview =
    type === 'image' ? 'Photo' : type === 'audio' ? 'Voice note' : type === 'system' ? text : text;

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    senderName,
    text,
    type,
    mediaUrl,
    timestamp: serverTimestamp(),
    readBy: {},
    replyToMessageId: replyToMessageId || null,
    ...(replyToStatusId ? { replyToStatusId } : {}),
    reactions: {},
  });

  const updates = {
    lastMessage: preview,
    lastMessageSenderId: senderId,
    lastMessageTime: serverTimestamp(),
    [`typingStatus.${senderId}`]: false,
  };
  chat.participantIds.forEach((pid) => {
    if (pid !== senderId) updates[`unreadCounts.${pid}`] = increment(1);
  });
  batch.update(chatRef, updates);
  await batch.commit();
}

export async function markChatRead(chatId, userId) {
  await setDoc(doc(chatsCol(), chatId), { unreadCounts: { [userId]: 0 } }, { merge: true });

  const snap = await getDocs(
    query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(80),
    ),
  );

  const batch = writeBatch(db);
  let writes = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.senderId === userId) continue;
    if (data.readBy?.[userId]) continue;
    batch.update(d.ref, { [`readBy.${userId}`]: serverTimestamp() });
    writes += 1;
    if (writes >= 40) break;
  }
  if (writes > 0) await batch.commit();
}

export async function setTyping(chatId, userId, isTyping) {
  await setDoc(
    doc(chatsCol(), chatId),
    { typingStatus: { [userId]: isTyping } },
    { merge: true },
  );
}

export async function toggleMute(chatId, userId, muted) {
  await updateDoc(doc(chatsCol(), chatId), {
    mutedBy: muted ? arrayUnion(userId) : arrayRemove(userId),
  });
}

export async function togglePin(chatId, userId, pinned) {
  await updateDoc(doc(chatsCol(), chatId), {
    pinnedBy: pinned ? arrayUnion(userId) : arrayRemove(userId),
  });
}

export async function createStatus({
  userId,
  type = 'text',
  text = '',
  mediaUrl = null,
  caption = '',
  backgroundColor = 0xff00c896,
  privacyMode = 'contacts',
  visibleTo = [],
  reactions = {},
}) {
  const id = uid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await setDoc(doc(statusesCol(), id), {
    userId,
    type: type === 'image' ? 'image' : 'text',
    mediaUrl: mediaUrl || null,
    text: text || '',
    backgroundColor,
    caption: caption || '',
    createdAt: serverTimestamp(),
    expiresAt,
    privacyMode,
    visibleTo,
    viewers: [],
    reactions: reactions || {},
  });
  return id;
}

/** Toggle an emoji reaction on a status. reactions: { [emoji]: string[] } */
export async function toggleStatusReaction(statusId, emoji, userId) {
  if (!statusId || !emoji || !userId) return;
  const ref = doc(statusesCol(), statusId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  const reactions = { ...(data.reactions || {}) };
  const list = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
  const idx = list.indexOf(userId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(userId);
  if (list.length) reactions[emoji] = list;
  else delete reactions[emoji];
  await updateDoc(ref, { reactions });
}

export function watchMyStatuses(userId, cb) {
  const q = query(statusesCol(), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const now = new Date();
    const items = snap.docs
      .map((d) => parseStatus(d.id, d.data()))
      .filter((s) => s.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(items);
  });
}

export function watchVisibleStatuses(userId, cb) {
  const q1 = query(statusesCol(), where('visibleTo', 'array-contains', userId));
  const q2 = query(statusesCol(), where('privacyMode', '==', 'everyone'));

  let visibleItems = [];
  let publicItems = [];

  const emit = () => {
    const now = new Date();
    const map = new Map();
    [...visibleItems, ...publicItems].forEach((s) => {
      if (s.userId === userId) return;
      if (!(s.expiresAt > now)) return;
      map.set(s.id, s);
    });
    cb([...map.values()].sort((a, b) => b.createdAt - a.createdAt));
  };

  const unsub1 = onSnapshot(q1, (snap) => {
    visibleItems = snap.docs.map((d) => parseStatus(d.id, d.data()));
    emit();
  });
  const unsub2 = onSnapshot(q2, (snap) => {
    publicItems = snap.docs.map((d) => parseStatus(d.id, d.data()));
    emit();
  });

  return () => {
    unsub1();
    unsub2();
  };
}

export async function markStatusViewed(statusId, viewerId) {
  await updateDoc(doc(statusesCol(), statusId), {
    viewers: arrayUnion(viewerId),
  });
}

export async function deleteStatus(statusId) {
  await deleteDoc(doc(statusesCol(), statusId));
}

export function watchCalls(userId, cb) {
  const q = query(callsCol(), where('participantIds', 'array-contains', userId), limit(50));
  return onSnapshot(q, (snap) => {
    const calls = snap.docs
      .map((d) => parseCall(d.id, d.data()))
      .sort((a, b) => b.startedAt - a.startedAt);
    cb(calls);
  });
}

export async function getUsersByIds(ids) {
  if (!ids?.length) return [];
  const users = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const snap = await getDocs(query(usersCol(), where(documentId(), 'in', chunk)));
    snap.docs.forEach((d) => users.push(parseUser(d.id, d.data())));
  }
  return users;
}

const MAX_MEDIA_BYTES = 700 * 1024;

function toUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  return new Uint8Array(bytes);
}

/** Store media in Firestore (nexus://media/{id}) — no Storage billing required. */
export async function uploadMediaBytes(bytes, { kind, contentType, ownerId, chatId }) {
  const uint8 = toUint8Array(bytes);
  if (uint8.byteLength > MAX_MEDIA_BYTES) {
    throw new Error(
      kind === 'audio'
        ? 'Voice note is too long for the free plan.'
        : 'Photo is too large for the free plan. Choose a smaller picture.',
    );
  }
  const id = uid();
  await setDoc(doc(mediaCol(), id), {
    ownerId,
    kind,
    contentType,
    ...(chatId ? { chatId } : {}),
    bytes: Bytes.fromUint8Array(uint8),
    createdAt: serverTimestamp(),
  });
  return mediaUrlFor(id);
}

/** Compress + upload an avatar image, return nexus://media/{id} URL. */
export async function uploadAvatar(userId, file) {
  const { blob, mimeType } = await compressImageFile(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.72,
    maxBytes: 650 * 1024,
  });
  const buf = await blob.arrayBuffer();
  return uploadMediaBytes(new Uint8Array(buf), {
    kind: 'avatar',
    contentType: mimeType || 'image/jpeg',
    ownerId: userId,
  });
}

/** Remove custom profile photo: reset to default avatar and delete Firestore media blob if any. */
export async function removeProfilePhoto(userId, displayName = '') {
  const ref = doc(usersCol(), userId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : {};
  const oldUrl = prev.avatarUrl || '';
  const nextName = (displayName || prev.name || 'Nexus user').toString().trim() || 'Nexus user';
  const fallback = defaultAvatarUrl(nextName);

  await updateProfile(userId, { name: nextName, avatarUrl: fallback });

  const mediaId = mediaIdFromUrl(oldUrl);
  if (mediaId) {
    try {
      await deleteDoc(doc(mediaCol(), mediaId));
    } catch (err) {
      console.warn('[removeProfilePhoto] media delete skipped:', err);
    }
  }
  return fallback;
}

export async function loadMediaBlob(url) {
  if (isRemoteHttpUrl(url)) return url;
  const cached = getCachedMedia(url);
  if (cached) return cached;
  const id = mediaIdFromUrl(url);
  if (!id) return null;
  const snap = await getDoc(doc(mediaCol(), id));
  if (!snap.exists()) return null;
  const data = snap.data();
  const raw = data.bytes;
  let bytes;
  if (raw?.toUint8Array) {
    bytes = raw.toUint8Array();
  } else if (raw instanceof Uint8Array) {
    bytes = raw;
  } else if (raw?.buffer) {
    bytes = new Uint8Array(raw.buffer);
  } else {
    return null;
  }
  const blob = new Blob([bytes], { type: data.contentType || 'application/octet-stream' });
  const objectUrl = URL.createObjectURL(blob);
  setCachedMedia(url, objectUrl);
  return objectUrl;
}

export { computeStatusAudience, parseUser, parseChat, parseMessage, parseStatus, parseCall };
