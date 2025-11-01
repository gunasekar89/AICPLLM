import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsPanel, { ModelSettings } from './components/SettingsPanel';

type Chat = {
  id: number;
  title: string;
  created_at: string;
};

type Message = {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type SettingsResponse = {
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8000/api';

function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light');
  const [settings, setSettings] = useState<ModelSettings>({ model: 'llama2', temperature: 0.7, maxTokens: 512 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchSettings();
    loadChats();
  }, []);

  useEffect(() => {
    if (activeChatId != null) {
      loadMessages(activeChatId);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (chats.length > 0 && activeChatId == null) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings`);
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const payload: SettingsResponse = await response.json();
      setSettings({
        model: payload.default_model,
        temperature: payload.default_temperature,
        maxTokens: payload.default_max_tokens,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadChats = async () => {
    try {
      const response = await fetch(`${API_BASE}/chats`);
      if (!response.ok) {
        throw new Error('Failed to load chats');
      }
      const payload: Chat[] = await response.json();
      setChats(payload);
      if (payload.length > 0 && activeChatId == null) {
        setActiveChatId(payload[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadMessages = async (chatId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chats/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const payload: Message[] = await response.json();
      setMessages(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    try {
      const response = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      const newChat: Chat = await response.json();
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setMessages([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await fetch(`${API_BASE}/chats/${chatId}`, { method: 'DELETE' });
      setChats((prev) => {
        const next = prev.filter((chat) => chat.id !== chatId);
        if (activeChatId === chatId) {
          setActiveChatId(next.length > 0 ? next[0].id : null);
          setMessages([]);
        }
        return next;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRenameChat = async (chatId: number, title: string) => {
    try {
      await fetch(`${API_BASE}/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)));
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || activeChatId == null || isStreaming) {
      return;
    }
    const chatId = activeChatId;
    const userMessage: Message = {
      id: Date.now(),
      chat_id: chatId,
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage, {
      id: -1,
      chat_id: chatId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }]);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_BASE}/chats/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to stream response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          if (!event.startsWith('data:')) continue;
          const payload = event.replace('data: ', '');
          try {
            const data = JSON.parse(payload);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.is_end) {
              await loadMessages(chatId);
              setMessages((prev) => prev.filter((msg) => msg.id !== -1));
            } else {
              assistantContent += data.message;
              setMessages((prev) => {
                const updated = [...prev];
                const index = updated.findIndex((msg) => msg.id === -1);
                if (index !== -1) {
                  updated[index] = { ...updated[index], content: assistantContent };
                }
                return updated;
              });
            }
          } catch (error) {
            console.error('Failed to parse stream chunk', error);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.filter((msg) => msg.id !== -1));
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to send message');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const detail = await response.json();
      throw new Error(detail?.detail ?? 'Failed to extract text');
    }
    const payload = await response.json();
    return payload.text as string;
  };

  const handleSettingsChange = (updated: ModelSettings) => {
    setSettings(updated);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onCreate={handleCreateChat}
        onDelete={handleDeleteChat}
        onRename={handleRenameChat}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
      <main className="flex flex-1 flex-col border-l border-r border-gray-200 dark:border-gray-800">
        <ChatWindow
          messages={messages}
          onSend={sendMessage}
          isStreaming={isStreaming}
          onUpload={handleFileUpload}
          loading={loading}
        />
      </main>
      <SettingsPanel settings={settings} onChange={handleSettingsChange} />
    </div>
  );
}

export default App;
