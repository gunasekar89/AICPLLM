import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import clsx from 'clsx';

export type ChatMessage = {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type ChatWindowProps = {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void> | void;
  isStreaming: boolean;
  onUpload: (file: File) => Promise<string>;
  loading: boolean;
};

const markdown = new MarkdownIt({ linkify: true, breaks: true });

function ChatWindow({ messages, onSend, isStreaming, onUpload, loading }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;
    try {
      await onSend(input);
      setInput('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const extracted = await onUpload(file);
      setInput((prev) => (prev ? `${prev}\n\n${extracted}` : extracted));
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to extract text');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-6">
        {loading && messages.length === 0 && (
          <div className="space-y-2 text-sm text-gray-500">
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-300 dark:bg-gray-700"></div>
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={`${message.role}-${message.id}-${message.created_at}`}
            className={clsx('rounded-lg px-4 py-3 shadow-sm', {
              'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100': message.role === 'assistant',
              'ml-auto max-w-3xl bg-primary text-white': message.role === 'user',
            })}
          >
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: markdown.render(message.content || (isStreaming ? '…' : '')) }}
            />
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="h-2 w-2 animate-ping rounded-full bg-primary"></span>
            Generating response...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        {error && <div className="mb-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900 dark:text-red-200">{error}</div>}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything..."
          className="mb-3 h-32 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx" className="hidden" onChange={handleFileUpload} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Upload file
            </button>
            <span className="text-xs text-gray-400">Supports TXT, MD, PDF, DOCX</span>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isStreaming ? 'Generating…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;
