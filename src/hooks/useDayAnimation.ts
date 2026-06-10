'use client';
import { useRef, useCallback, useState, useEffect } from 'react';

const PLAY_DURATION_MS = 15000; // 15 s real time = full day

export function useDayAnimation(
  onChange: (hour: number) => void,
  bounds: { sunrise: number; sunset: number },
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const hourRef = useRef<number>(bounds.sunrise);

  const sunriseRef = useRef(bounds.sunrise);
  const sunsetRef = useRef(bounds.sunset);
  sunriseRef.current = bounds.sunrise;
  sunsetRef.current = bounds.sunset;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stopRaf = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  const tick = useCallback((now: number) => {
    const sunrise = sunriseRef.current;
    const sunset = sunsetRef.current;
    const dayDuration = sunset - sunrise;
    const elapsed = now - startRef.current;
    const frac = Math.min(elapsed / PLAY_DURATION_MS, 1);
    const hour = sunrise + frac * dayDuration;
    hourRef.current = hour;
    onChangeRef.current(hour);
    if (frac < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(() => {
    const sunrise = sunriseRef.current;
    const sunset = sunsetRef.current;
    const dayDuration = sunset - sunrise;
    if (hourRef.current >= sunset - 0.01) hourRef.current = sunrise;
    const alreadyElapsed = ((hourRef.current - sunrise) / dayDuration) * PLAY_DURATION_MS;
    startRef.current = performance.now() - alreadyElapsed;
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    stopRaf();
  }, [stopRaf]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const scrub = useCallback(
    (hour: number) => {
      pause();
      hourRef.current = hour;
      onChangeRef.current(hour);
    },
    [pause],
  );

  useEffect(() => () => stopRaf(), [stopRaf]);

  return { isPlaying, toggle, scrub };
}
