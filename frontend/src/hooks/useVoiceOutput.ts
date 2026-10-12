import { useCallback } from 'react';
import { useVoiceStore } from '../store/voiceStore';

export function useVoiceOutput() {
  const { isPlaying, isLoading, currentPlayingText, play, stop } = useVoiceStore();

  const speak = useCallback(
    async (text: string, language: string = 'en', speed?: number, messageId?: string) => {
      await play(text, language, speed, messageId);
    },
    [play]
  );

  return {
    isPlaying,
    isLoading,
    currentPlayingText,
    speak,
    stop,
  };
}
