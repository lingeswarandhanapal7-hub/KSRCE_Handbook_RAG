import { useState, useEffect, useRef } from 'react';

export function useAudioAnalyser(stream: MediaStream | null) {
  const [amplitude, setAmplitude] = useState<number>(0);
  const [frequencies, setFrequencies] = useState<number[]>(new Array(16).fill(0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setAmplitude(0);
      setFrequencies(new Array(16).fill(0));
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);

        // Average volume amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255; // 0.0 to 1.0
        setAmplitude(avg);

        // 16 bars sample
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 16));
        for (let i = 0; i < 16; i++) {
          bars.push((dataArray[i * step] || 0) / 255);
        }
        setFrequencies(bars);

        animFrameRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (e) {
      console.warn('Web Audio Analyser not supported or error:', e);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, [stream]);

  return { amplitude, frequencies };
}
