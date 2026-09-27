import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import { cn, formatMessageTime } from '../lib/utils';
import MediaImage from './MediaImage';

export default function MessageBubble({ message, isMine, showSender, participants = [] }) {
  const others = participants.filter((id) => id !== message.senderId);
  const readByAll =
    others.length > 0 && others.every((id) => message.readBy?.[id]);
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-graphite-elevated/80 px-3 py-1 text-xs text-silver-muted">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={cn('mb-1.5 flex', isMine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-3 py-2 shadow-sm',
          isMine
            ? 'rounded-br-md bg-emerald-subtle border border-emerald-primary/20 text-silver-text'
            : 'rounded-bl-md bg-graphite-elevated text-silver-text',
        )}
      >
        {showSender && !isMine && (
          <p className="mb-0.5 text-xs font-semibold text-emerald-primary">
            {message.senderName || 'Member'}
          </p>
        )}
        {message.type === 'image' && message.mediaUrl && (
          <MediaImage
            url={message.mediaUrl}
            alt="Photo"
            className="mb-1 max-h-64 w-full rounded-xl object-cover"
          />
        )}
        {message.text && message.type !== 'image' && (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {message.text}
          </p>
        )}
        {message.type === 'image' && message.caption && (
          <p className="mt-1 text-sm text-silver-secondary">{message.caption}</p>
        )}
        <div
          className={cn(
            'mt-1 flex items-center gap-1',
            isMine ? 'justify-end' : 'justify-start',
          )}
        >
          <span className="text-[10px] text-silver-muted">
            {formatMessageTime(message.timestamp)}
          </span>
          {isMine &&
            (readByAll ? (
              <CheckCheck size={14} className="text-emerald-glow" />
            ) : (
              <Check size={14} className="text-silver-muted" />
            ))}
        </div>
      </div>
    </motion.div>
  );
}
