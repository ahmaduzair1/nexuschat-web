import { Outlet, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import Chats from './Chats';

/**
 * Desktop: chat list sidebar + conversation pane side-by-side.
 * Mobile: list OR conversation (full screen), never both.
 */
export default function ChatsLayout() {
  const { chatId } = useParams();
  const chatOpen = Boolean(chatId);

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        className={cn(
          'flex min-h-0 shrink-0 flex-col border-r border-white/5 bg-graphite-surface/40',
          'w-full lg:w-[360px] xl:w-[380px]',
          chatOpen ? 'hidden lg:flex' : 'flex',
        )}
      >
        <Chats />
      </aside>
      <section
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          chatOpen ? 'flex' : 'hidden lg:flex',
        )}
      >
        <Outlet />
      </section>
    </div>
  );
}
