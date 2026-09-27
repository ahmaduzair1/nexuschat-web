import { Lock, MessageCircle } from 'lucide-react';

/** WhatsApp Web–style empty conversation pane for desktop split view. */
export default function ChatEmpty() {
  return (
    <div className="hidden min-h-0 flex-1 flex-col items-center justify-center border-l border-white/[0.03] bg-[radial-gradient(ellipse_at_center,_rgba(10,61,46,0.2),_transparent_55%)] px-10 text-center lg:flex">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-primary/20 bg-graphite-surface/80 shadow-glass">
        <MessageCircle className="text-emerald-primary" size={42} strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-3xl font-bold tracking-tight text-silver-text">
        Nexus Chat
      </h2>
      <p className="mt-3 max-w-md text-base text-silver-muted">
        Select a chat to start messaging
      </p>
      <div className="mt-10 flex max-w-sm items-start gap-3 rounded-2xl border border-white/5 bg-graphite-light/40 px-4 py-3 text-left">
        <Lock size={16} className="mt-0.5 shrink-0 text-silver-faint" />
        <p className="text-xs leading-relaxed text-silver-faint">
          Your personal messages are synced with Firebase. Pick a conversation from the list on
          the left, or start a new chat.
        </p>
      </div>
    </div>
  );
}
