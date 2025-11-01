import { Bars3BottomLeftIcon, MoonIcon, PlusIcon, SunIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type SidebarProps = {
  chats: { id: number; title: string; created_at: string }[];
  activeChatId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
};

function Sidebar({ chats, activeChatId, onSelect, onCreate, onDelete, onRename, onToggleTheme, theme }: SidebarProps) {
  const handleRename = (chatId: number, currentTitle: string) => {
    const newTitle = window.prompt('Rename chat', currentTitle);
    if (newTitle && newTitle.trim().length > 0) {
      onRename(chatId, newTitle.trim());
    }
  };

  return (
    <aside className="flex w-72 flex-col bg-gray-50 p-4 shadow-lg dark:bg-gray-950">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <Bars3BottomLeftIcon className="h-6 w-6" />
          <span>Conversations</span>
        </div>
        <button
          onClick={onToggleTheme}
          className="rounded-full bg-gray-200 p-2 text-gray-800 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          title="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
        </button>
      </div>

      <button
        onClick={onCreate}
        className="mb-4 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow hover:bg-primary-dark"
      >
        <PlusIcon className="h-4 w-4" />
        New chat
      </button>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {chats.length === 0 && (
          <p className="text-sm text-gray-500">No conversations yet. Create your first chat.</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={clsx(
              'group flex items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm transition',
              activeChatId === chat.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            )}
          >
            <button onClick={() => onSelect(chat.id)} className="flex-1 text-left">
              <div className="font-medium">{chat.title}</div>
              <div className="text-xs text-gray-400">{new Date(chat.created_at).toLocaleString()}</div>
            </button>
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => handleRename(chat.id, chat.title)}
                className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                Rename
              </button>
              <button
                onClick={() => onDelete(chat.id)}
                className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
                title="Delete chat"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
