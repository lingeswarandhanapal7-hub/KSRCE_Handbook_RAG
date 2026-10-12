import { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '../lib/api';

interface UseVoiceInputOptions {
  languageLocale?: string;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onSilenceAutoStop?: () => void;
}

export function useVoiceInput({
  languageLocale = 'en-IN',
  onInterimTranscript,
  onFinalTranscript,
  onSilenceAutoStop,
}: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const maxTimerRef = useRef<any>(null);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      onSilenceAutoStop?.();
    }, 1800); // 1.8s silence detection
  }, [onSilenceAutoStop]);

  const startRecording = useCallback(async () => {
    // Barge-in: Notify any ongoing speech to stop
    if ((window as any).__ksrce_stop_audio) {
      (window as any).__ksrce_stop_audio();
    }

    setInterimText('');
    setIsRecording(true);

    // Request microphone stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
    } catch (err) {
      console.error('Microphone permission denied or not available:', err);
      setIsRecording(false);
      return;
    }

    // 60-second cap timer
    maxTimerRef.current = setTimeout(() => {
      stopRecording();
    }, 60000);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Path A: Browser Web Speech API if supported and not auto
    if (SpeechRecognition && languageLocale !== 'auto') {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = languageLocale;

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalVal = event.results[i][0].transcript;
              onFinalTranscript?.(finalVal);
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }
          if (currentInterim) {
            setInterimText(currentInterim);
            onInterimTranscript?.(currentInterim);
            resetSilenceTimer();
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition error, falling back to MediaRecorder:', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (e) {
        console.warn('Failed to start SpeechRecognition:', e);
      }
    }

    // Path B: MediaRecorder -> /api/stt (Fallback or Auto-detect)
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          setIsTranscribing(true);
          try {
            const resp = await transcribeAudio(audioBlob, languageLocale);
            if (resp.text) {
              onFinalTranscript?.(resp.text);
            }
          } catch (e) {
            console.error('Backend STT failed:', e);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.error('MediaRecorder start error:', e);
      setIsRecording(false);
    }
  }, [languageLocale, onInterimTranscript, onFinalTranscript, resetSilenceTimer]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      setActiveStream(null);
    }
  }, [activeStream]);

  return {
    isRecording,
    isTranscribing,
    interimText,
    activeStream,
    startRecording,
    stopRecording,
  };
}
