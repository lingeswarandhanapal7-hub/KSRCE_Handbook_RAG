import { create } from 'zustand';
import { synthesizeSpeech } from '../lib/api';
import { useSettingsStore } from './settingsStore';

export function cleanTextForAudio(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[S\d+\]/g, '') // remove [S1], [S2]
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`[^`]*`/g, '') // remove inline code
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [link](url) -> link
    .replace(/https?:\/\/\S+/g, '') // remove urls
    .replace(/\|/g, ' ') // replace table delimiters
    .replace(/[*#_~]/g, '') // remove bold, italics, headers
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectLanguageFromText(text: string, languageHint?: string): string {
  if (!text) return languageHint && languageHint !== 'auto' ? languageHint : 'en';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi / Devanagari
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
  if (languageHint && languageHint !== 'auto') {
    return languageHint.toLowerCase().split('-')[0].trim();
  }
  return 'en';
}

interface VoiceState {
  isPlaying: boolean;
  isLoading: boolean;
  currentPlayingText: string | null;
  activeMessageId: string | null;
  play: (text: string, language?: string, speed?: number, messageId?: string, forceEngine?: 'browser' | 'gemini') => Promise<void>;
  stop: () => void;
}

// Module-level singletons to ensure only ONE audio stream can ever exist
let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;

export const useVoiceStore = create<VoiceState>((set, get) => {
  const stop = () => {
    // 1. Cancel in-flight network request
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    // 2. Stop HTML5 audio
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = '';
      activeAudio = null;
    }

    // 3. Stop native browser SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    set({
      isPlaying: false,
      isLoading: false,
      currentPlayingText: null,
      activeMessageId: null,
    });
  };

  const playCloudSpeech = async (
    text: string,
    language: string = 'en',
    speed: number = 1.0,
    messageId?: string
  ) => {
    const clean = cleanTextForAudio(text);
    if (!clean) {
      stop();
      return;
    }

    const effectiveLang = detectLanguageFromText(clean, language);

    set({
      isLoading: true,
      isPlaying: false,
      currentPlayingText: text,
      activeMessageId: messageId || null,
    });

    const abortController = new AbortController();
    activeAbortController = abortController;

    try {
      const audioBlob = await synthesizeSpeech(clean, effectiveLang, speed, abortController.signal);
      if (abortController.signal.aborted) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = speed;
      activeAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        stop();
      };

      audio.onerror = (err) => {
        URL.revokeObjectURL(audioUrl);
        console.warn('Audio playback error:', err);
        stop();
      };

      await audio.play();

      set({
        isPlaying: true,
        isLoading: false,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('Cloud TTS synthesis failed:', err);
      stop();
    }
  };

  const playBrowserSpeech = (
    text: string,
    language: string = 'en',
    speed: number = 1.0,
    messageId?: string
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      playCloudSpeech(text, language, speed, messageId);
      return;
    }

    const clean = cleanTextForAudio(text);
    if (!clean) {
      stop();
      return;
    }

    const effectiveLang = detectLanguageFromText(clean, language);
    const bcp47Map: Record<string, string> = {
      ta: 'ta-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      bn: 'bn-IN',
      gu: 'gu-IN',
      mr: 'mr-IN',
      ur: 'ur-IN',
      en: 'en-IN',
    };
    const targetLocale = bcp47Map[effectiveLang] || (effectiveLang.includes('-') ? effectiveLang : `${effectiveLang}-IN`);

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = effectiveLang.toLowerCase();

    // Look for voice matching language or locale
    const matchedVoice = voices.find((v) => {
      const vLang = v.lang.toLowerCase();
      const vName = v.name.toLowerCase();
      return vLang.startsWith(langPrefix) || vName.includes(effectiveLang);
    });

    // If the text is in an Indic regional language and the browser lacks a native regional voice,
    // automatically delegate to Cloud Google TTS to guarantee natural regional speech!
    if (effectiveLang !== 'en' && !matchedVoice) {
      playCloudSpeech(text, effectiveLang, speed, messageId);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = speed;
    utterance.lang = targetLocale;

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      set({
        isPlaying: true,
        isLoading: false,
        currentPlayingText: text,
        activeMessageId: messageId || null,
      });
    };

    utterance.onend = () => {
      set({
        isPlaying: false,
        isLoading: false,
        currentPlayingText: null,
        activeMessageId: null,
      });
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Browser SpeechSynthesis error, falling back to cloud TTS:', e);
        playCloudSpeech(text, effectiveLang, speed, messageId);
      } else {
        set({
          isPlaying: false,
          isLoading: false,
          currentPlayingText: null,
          activeMessageId: null,
        });
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const play = async (
    text: string,
    language: string = 'en',
    speed: number = 1.0,
    messageId?: string,
    forceEngine?: 'browser' | 'gemini'
  ) => {
    // 1. Immediately stop any active or buffering speech
    stop();

    if (!text.trim()) return;

    const { ttsEngine, speechSpeed } = useSettingsStore.getState();
    const actualSpeed = speed || speechSpeed || 1.0;
    const engine = forceEngine || ttsEngine || 'browser';
    const effectiveLang = detectLanguageFromText(text, language);

    // If Cloud engine requested OR text is in regional script and engine is gemini, use cloud TTS
    if (engine === 'gemini') {
      await playCloudSpeech(text, effectiveLang, actualSpeed, messageId);
    } else {
      playBrowserSpeech(text, effectiveLang, actualSpeed, messageId);
    }
  };

  // Register global barge-in & auto-read handlers
  if (typeof window !== 'undefined') {
    (window as any).__ksrce_stop_audio = stop;
    (window as any).__ksrce_read_aloud_callback = (text: string, lang?: string) => {
      play(text, lang);
    };
  }

  return {
    isPlaying: false,
    isLoading: false,
    currentPlayingText: null,
    activeMessageId: null,
    play,
    stop,
  };
});
