import { create } from 'zustand';
import { db, DBMessage, DBSession, DBCitation } from './db';
import { streamChat, translateText } from '../lib/api';
import { detectLanguageFromText } from './voiceStore';

export interface StageInfo {
  stage: 'understanding' | 'searching' | 'reading' | 'writing';
  message: string;
  pages?: number[];
}

interface ChatState {
  sessions: DBSession[];
  activeSessionId: string | null;
  messages: DBMessage[];
  isStreaming: boolean;
  activeStage: StageInfo | null;
  activeSources: DBCitation[];
  streamedContent: string;
  followUpSuggestions: string[];
  activeDrawerCitation: DBCitation | null;
  isDrawerOpen: boolean;
  isVoiceModeOpen: boolean;
  isSettingsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isShortcutsOpen: boolean;
  isFeedbackOpen: boolean;
  activeFeedbackMessageId: string | null;
  abortController: AbortController | null;

  // Actions
  loadSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  pinSession: (sessionId: string, pinned: boolean) => Promise<void>;
  sendMessage: (text: string, dictated?: boolean, languagePreference?: string) => Promise<void>;
  stopStreaming: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;
  translateMessageInPlace: (messageId: string, targetLanguage: string) => Promise<void>;
  recordFeedback: (messageId: string, rating: number) => Promise<void>;
  openCitationDrawer: (citation: DBCitation) => void;
  closeCitationDrawer: () => void;
  setVoiceModeOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setFeedbackOpen: (open: boolean, messageId?: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  activeStage: null,
  activeSources: [],
  streamedContent: '',
  followUpSuggestions: [],
  activeDrawerCitation: null,
  isDrawerOpen: false,
  isVoiceModeOpen: false,
  isSettingsOpen: false,
  isCommandPaletteOpen: false,
  isShortcutsOpen: false,
  isFeedbackOpen: false,
  activeFeedbackMessageId: null,
  abortController: null,

  loadSessions: async () => {
    const sessions = await db.sessions.reverse().sortBy('updatedAt');
    set({ sessions });
    if (sessions.length > 0 && !get().activeSessionId) {
      await get().switchSession(sessions[0].id);
    }
  },

  createSession: async () => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession: DBSession = {
      id,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    await db.sessions.add(newSession);
    const sessions = await db.sessions.reverse().sortBy('updatedAt');
    set({ sessions, activeSessionId: id, messages: [], activeSources: [], activeStage: null, followUpSuggestions: [] });
    return id;
  },

  switchSession: async (sessionId: string) => {
    get().stopStreaming();
    const messages = await db.messages.where('sessionId').equals(sessionId).sortBy('createdAt');
    set({
      activeSessionId: sessionId,
      messages,
      activeSources: [],
      activeStage: null,
      streamedContent: '',
      followUpSuggestions: messages.length > 0 ? (messages[messages.length - 1].suggestions || []) : [],
    });
  },

  deleteSession: async (sessionId: string) => {
    await db.messages.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
    const sessions = await db.sessions.reverse().sortBy('updatedAt');
    set({ sessions });
    if (get().activeSessionId === sessionId) {
      if (sessions.length > 0) {
        await get().switchSession(sessions[0].id);
      } else {
        await get().createSession();
      }
    }
  },

  renameSession: async (sessionId: string, newTitle: string) => {
    await db.sessions.update(sessionId, { title: newTitle, updatedAt: Date.now() });
    const sessions = await db.sessions.reverse().sortBy('updatedAt');
    set({ sessions });
  },

  pinSession: async (sessionId: string, pinned: boolean) => {
    await db.sessions.update(sessionId, { pinned, updatedAt: Date.now() });
    const sessions = await db.sessions.reverse().sortBy('updatedAt');
    set({ sessions });
  },

  sendMessage: async (text: string, dictated: boolean = false, languagePreference: string = 'auto') => {
    const cleanText = text.trim();
    if (!cleanText || get().isStreaming) return;

    let sessionId = get().activeSessionId;
    if (!sessionId) {
      sessionId = await get().createSession();
    }

    const userMessage: DBMessage = {
      id: `msg_u_${Date.now()}`,
      sessionId,
      role: 'user',
      content: cleanText,
      createdAt: Date.now(),
      dictated,
    };

    await db.messages.add(userMessage);

    // Auto-title session on first question
    const currentMessages = get().messages;
    if (currentMessages.length === 0) {
      const title = cleanText.length > 36 ? `${cleanText.substring(0, 36)}...` : cleanText;
      await db.sessions.update(sessionId, { title, updatedAt: Date.now() });
      const sessions = await db.sessions.reverse().sortBy('updatedAt');
      set({ sessions });
    }

    const updatedMessages = [...currentMessages, userMessage];
    set({
      messages: updatedMessages,
      isStreaming: true,
      activeStage: { stage: 'understanding', message: 'Analyzing your query...' },
      activeSources: [],
      streamedContent: '',
      followUpSuggestions: [],
    });

    const abortController = new AbortController();
    set({ abortController });

    const historyForApi = updatedMessages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let currentSources: DBCitation[] = [];
    let answerText = '';
    let suggestionsList: string[] = [];

    await streamChat({
      sessionId,
      message: cleanText,
      language: languagePreference,
      history: historyForApi,
      signal: abortController.signal,
      onStatus: (stage: any, msg: string, pages?: number[]) => {
        set({ activeStage: { stage, message: msg, pages } });
      },
      onSources: (sources) => {
        currentSources = sources;
        set({ activeSources: sources });
      },
      onToken: (delta) => {
        answerText += delta;
        set({ streamedContent: answerText });
      },
      onSuggestions: (suggs) => {
        suggestionsList = suggs;
        set({ followUpSuggestions: suggs });
      },
      onError: async (code, err) => {
        const errorContent = answerText || `⚠️ Unable to generate answer (${code}): ${err}\n\nPlease try resending your message or choosing a starter topic.`;
        const assistantMessage: DBMessage = {
          id: `msg_a_${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: errorContent,
          sources: currentSources,
          suggestions: ["Try asking again", "What is the attendance policy?"],
          createdAt: Date.now(),
        };

        await db.messages.add(assistantMessage);
        await db.sessions.update(sessionId, { updatedAt: Date.now() });

        set({
          messages: [...get().messages, assistantMessage],
          isStreaming: false,
          activeStage: null,
          streamedContent: '',
          abortController: null,
        });
      },
      onDone: async () => {
        const detectedLang = detectLanguageFromText(answerText, languagePreference);
        const assistantMessage: DBMessage = {
          id: `msg_a_${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: answerText,
          language: detectedLang,
          sources: currentSources,
          suggestions: suggestionsList,
          createdAt: Date.now(),
        };

        await db.messages.add(assistantMessage);
        await db.sessions.update(sessionId, { updatedAt: Date.now() });

        set({
          messages: [...get().messages, assistantMessage],
          isStreaming: false,
          activeStage: null,
          streamedContent: '',
          abortController: null,
        });

        // Trigger auto-read if read-aloud setting is enabled
        const readAloud = localStorage.getItem('ksrce_read_aloud') === 'true';
        if (readAloud && (window as any).__ksrce_read_aloud_callback) {
          (window as any).__ksrce_read_aloud_callback(answerText, detectedLang);
        }
      },
    });
  },

  stopStreaming: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isStreaming: false, activeStage: null, abortController: null });
  },

  regenerateMessage: async (messageId: string) => {
    const { messages } = get();
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    // Find the preceding user message
    let userMsg = '';
    for (let i = idx; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsg = messages[i].content;
        break;
      }
    }
    if (userMsg) {
      await get().sendMessage(userMsg);
    }
  },

  translateMessageInPlace: async (messageId: string, targetLanguage: string) => {
    const { messages } = get();
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    try {
      const translated = await translateText(targetMsg.content, targetLanguage);
      await db.messages.update(messageId, {
        translatedContent: translated,
        translatedLanguage: targetLanguage,
      });
      const updated = messages.map((m) =>
        m.id === messageId ? { ...m, translatedContent: translated, translatedLanguage: targetLanguage } : m
      );
      set({ messages: updated });
    } catch (e) {
      console.error('Translation failed', e);
    }
  },

  recordFeedback: async (messageId: string, rating: number) => {
    await db.messages.update(messageId, { feedback: rating });
    const updated = get().messages.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m));
    set({ messages: updated });
  },

  openCitationDrawer: (citation: DBCitation) => {
    set({ activeDrawerCitation: citation, isDrawerOpen: true });
  },

  closeCitationDrawer: () => {
    set({ isDrawerOpen: false, activeDrawerCitation: null });
  },

  setVoiceModeOpen: (open: boolean) => set({ isVoiceModeOpen: open }),
  setSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),
  setCommandPaletteOpen: (open: boolean) => set({ isCommandPaletteOpen: open }),
  setShortcutsOpen: (open: boolean) => set({ isShortcutsOpen: open }),
  setFeedbackOpen: (open: boolean, messageId?: string) => set({ isFeedbackOpen: open, activeFeedbackMessageId: messageId || null }),
}));
