import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type TTSEngine = 'browser' | 'gemini';

interface SettingsState {
  theme: ThemeMode;
  uiLanguage: string;
  answerLanguage: string;
  voiceLanguage: string;
  readAloud: boolean;
  ttsEngine: TTSEngine;
  speechSpeed: number;
  autoSendAfterDictation: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
  setTheme: (theme: ThemeMode) => void;
  setUILanguage: (lang: string) => void;
  setAnswerLanguage: (lang: string) => void;
  setVoiceLanguage: (lang: string) => void;
  setReadAloud: (val: boolean) => void;
  setTTSEngine: (engine: TTSEngine) => void;
  setSpeechSpeed: (speed: number) => void;
  setAutoSendAfterDictation: (val: boolean) => void;
  setReduceMotion: (val: boolean) => void;
  setCompactMode: (val: boolean) => void;
}

const applyThemeToDOM = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }
};

const savedTheme = (localStorage.getItem('ksrce_theme') as ThemeMode) || 'dark';
applyThemeToDOM(savedTheme);

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: savedTheme,
  uiLanguage: localStorage.getItem('ksrce_ui_language') || 'en-IN',
  answerLanguage: localStorage.getItem('ksrce_answer_language') || 'auto',
  voiceLanguage: localStorage.getItem('ksrce_voice_language') || 'auto',
  readAloud: localStorage.getItem('ksrce_read_aloud') === 'true',
  ttsEngine: (localStorage.getItem('ksrce_tts_engine') as TTSEngine) || 'browser',
  speechSpeed: parseFloat(localStorage.getItem('ksrce_speech_speed') || '1.0'),
  autoSendAfterDictation: localStorage.getItem('ksrce_auto_send') === 'true',
  reduceMotion: localStorage.getItem('ksrce_reduce_motion') === 'true',
  compactMode: localStorage.getItem('ksrce_compact_mode') === 'true',

  setTheme: (theme) => {
    localStorage.setItem('ksrce_theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },
  setUILanguage: (uiLanguage) => {
    localStorage.setItem('ksrce_ui_language', uiLanguage);
    set({ uiLanguage });
  },
  setAnswerLanguage: (answerLanguage) => {
    localStorage.setItem('ksrce_answer_language', answerLanguage);
    set({ answerLanguage });
  },
  setVoiceLanguage: (voiceLanguage) => {
    localStorage.setItem('ksrce_voice_language', voiceLanguage);
    set({ voiceLanguage });
  },
  setReadAloud: (readAloud) => {
    localStorage.setItem('ksrce_read_aloud', String(readAloud));
    set({ readAloud });
  },
  setTTSEngine: (ttsEngine) => {
    localStorage.setItem('ksrce_tts_engine', ttsEngine);
    set({ ttsEngine });
  },
  setSpeechSpeed: (speechSpeed) => {
    localStorage.setItem('ksrce_speech_speed', String(speechSpeed));
    set({ speechSpeed });
  },
  setAutoSendAfterDictation: (autoSendAfterDictation) => {
    localStorage.setItem('ksrce_auto_send', String(autoSendAfterDictation));
    set({ autoSendAfterDictation });
  },
  setReduceMotion: (reduceMotion) => {
    localStorage.setItem('ksrce_reduce_motion', String(reduceMotion));
    set({ reduceMotion });
  },
  setCompactMode: (compactMode) => {
    localStorage.setItem('ksrce_compact_mode', String(compactMode));
    set({ compactMode });
  },
}));
