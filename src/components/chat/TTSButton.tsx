import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';

type TTSState = 'idle' | 'speaking' | 'paused';
type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface TTSButtonProps {
  text: string;
}

/** Strips markdown formatting to produce clean plaintext for TTS */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' code block omitted ')   // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')                            // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')               // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                // links
    .replace(/#{1,6}\s+/g, '')                               // headings
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')           // bold/italic
    .replace(/~~([^~]+)~~/g, '$1')                           // strikethrough
    .replace(/^\s*[-*+]\s+/gm, '')                           // unordered lists
    .replace(/^\s*\d+\.\s+/gm, '')                           // ordered lists
    .replace(/^\s*>\s+/gm, '')                               // blockquotes
    .replace(/---+/g, '')                                    // horizontal rules
    .replace(/\|[^\n]+\|/g, '')                              // table rows
    .replace(/\n{3,}/g, '\n\n')                              // excessive newlines
    .trim();
}

export default function TTSButton({ text }: TTSButtonProps) {
  const { state, isDark } = useChat();
  const [ttsState, setTtsState] = useState<TTSState>('idle');
  const [speed, setSpeed] = useState<PlaybackSpeed>(state.voiceSettings.ttsRate as PlaybackSpeed || 1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [progress, setProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const estimatedDurationRef = useRef<number>(0);
  const currentTextRef = useRef<string>('');
  const charPositionRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSpeedMenu]);

  // Sync with external speech cancellation (e.g. another TTS button clicked)
  useEffect(() => {
    if (ttsState === 'idle') return;
    const check = setInterval(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        setTtsState('idle');
        setProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 300);
    return () => clearInterval(check);
  }, [ttsState]);

  const estimateDuration = useCallback((textLength: number, rate: number): number => {
    // Average speaking rate: ~150 words/min, avg word ~5 chars → ~750 chars/min at rate 1
    const charsPerSecond = (750 / 60) * rate;
    return (textLength / charsPerSecond) * 1000;
  }, []);

  const startProgressTracking = useCallback((duration: number, startPos: number = 0) => {
    startTimeRef.current = Date.now();
    estimatedDurationRef.current = duration;
    charPositionRef.current = startPos;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      // Update estimated character position
      const totalChars = currentTextRef.current.length;
      charPositionRef.current = Math.floor((startPos + (pct / 100) * (totalChars - startPos)));
      if (pct >= 100 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, 100);
  }, []);

  const handlePlay = useCallback((fromPosition: number = 0) => {
    if (!window.speechSynthesis) return;

    if (ttsState === 'paused') {
      window.speechSynthesis.resume();
      setTtsState('speaking');
      // Resume progress tracking from current position
      const remaining = estimatedDurationRef.current * (1 - progress / 100);
      startProgressTracking(remaining, charPositionRef.current);
      return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const cleanText = stripMarkdown(text);
    currentTextRef.current = cleanText;
    
    // Resume from specific position if provided
    const textToSpeak = fromPosition > 0 ? cleanText.slice(fromPosition) : cleanText;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speed;
    utterance.pitch = state.voiceSettings.ttsPitch;

    if (state.voiceSettings.ttsVoice) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === state.voiceSettings.ttsVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => {
      setTtsState('speaking');
      const duration = estimateDuration(textToSpeak.length, speed);
      startProgressTracking(duration, fromPosition);
    };

    utterance.onend = () => {
      setTtsState('idle');
      setProgress(0);
      charPositionRef.current = 0;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    utterance.onerror = () => {
      setTtsState('idle');
      setProgress(0);
      charPositionRef.current = 0;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [ttsState, text, speed, state.voiceSettings, progress, estimateDuration, startProgressTracking]);

  const handlePause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setTtsState('paused');
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setTtsState('idle');
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  }, []);

  const cycleSpeed = useCallback((newSpeed?: PlaybackSpeed) => {
    const next = newSpeed ?? SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);

    // If currently speaking, resume from current position with new speed
    if (ttsState === 'speaking') {
      const currentPosition = charPositionRef.current;
      window.speechSynthesis.cancel();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      // Small delay to let cancel complete
      setTimeout(() => {
        const cleanText = currentTextRef.current || stripMarkdown(text);
        const textToSpeak = cleanText.slice(currentPosition);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = next as number;
        utterance.pitch = state.voiceSettings.ttsPitch as number;
        if (state.voiceSettings.ttsVoice) {
          const voices = window.speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === state.voiceSettings.ttsVoice);
          if (voice) utterance.voice = voice;
        }
        utterance.onend = () => {
          setTtsState('idle');
          setProgress(0);
          charPositionRef.current = 0;
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
        utterance.onerror = () => {
          setTtsState('idle');
          setProgress(0);
          charPositionRef.current = 0;
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setTtsState('speaking');
        const duration = estimateDuration(textToSpeak.length, next as number);
        startProgressTracking(duration, currentPosition);
      }, 50);
    }
  }, [speed, ttsState, text, state.voiceSettings, estimateDuration, startProgressTracking]);

  const handleShareText = useCallback(async () => {
    const cleanText = stripMarkdown(text);

    // Try to generate audio file for sharing
    try {
      // Attempt to use MediaRecorder to capture audio (limited browser support)
      // Most browsers don't allow capturing speechSynthesis output
      // So we'll fallback to text sharing with note about TTS
      
      if (navigator.share) {
        // Create a text file with TTS-ready content
       const blob = new Blob([cleanText], { type: 'text/plain' });
        const file = new File([blob], 'ai-response.txt', { type: 'text/plain' });
        
        // Try sharing the file
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'AI Response (Text for TTS)',
            text: 'Use your device\'s text-to-speech feature to listen',
          });
          return;
        }
      }
      
      // Fallback: download as text file
      const blob = new Blob([cleanText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-response-tts.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Final fallback: copy to clipboard
      await navigator.clipboard.writeText(cleanText);
    }
  }, [text]);

  // Don't render if TTS is disabled or speechSynthesis is unavailable
  if (!state.voiceSettings.isTTSEnabled || !window.speechSynthesis) {
    return null;
  }

  const buttonBase = `flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded min-h-[28px] sm:min-h-[32px] transition-colors`;
  const buttonTheme = isDark
    ? 'bg-dark-100 text-gray-300 hover:bg-dark-300'
    : 'bg-light-300 text-gray-700 hover:bg-light-400';
  const activeTheme = isDark
    ? 'bg-theme-primary/20 text-theme-primary hover:bg-theme-primary/30'
    : 'bg-theme-primary-light text-theme-primary hover:bg-theme-primary/20';

  return (
    <div className="flex items-center gap-1 relative">
      {/* Play / Pause / Stop button */}
      <button
        onClick={() => ttsState === 'idle' ? handlePlay() : ttsState === 'speaking' ? handlePause() : handlePlay()}
        className={`${buttonBase} ${ttsState !== 'idle' ? activeTheme : buttonTheme} relative overflow-hidden`}
        title={
          ttsState === 'idle'
            ? 'Read aloud (Ctrl+.)'
            : ttsState === 'speaking'
            ? 'Pause reading'
            : 'Resume reading'
        }
      >
        {/* Progress bar background */}
        {ttsState !== 'idle' && (
          <>
            <span
              className="absolute inset-0 bg-theme-primary/30 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
            <span
              className="absolute bottom-0 left-0 right-0 h-1 bg-theme-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </>
        )}
        <span className="relative z-10 flex items-center gap-1">
          {ttsState === 'idle' && '🔊'}
          {ttsState === 'speaking' && '⏸️'}
          {ttsState === 'paused' && '▶️'}
          <span className="hidden xs:inline">
            {ttsState === 'idle' && 'Listen'}
            {ttsState === 'speaking' && 'Pause'}
            {ttsState === 'paused' && 'Resume'}
          </span>
        </span>
      </button>

      {/* Stop button (only when active) */}
      {ttsState !== 'idle' && (
        <button
          onClick={handleStop}
          className={`${buttonBase} ${buttonTheme}`}
          title="Stop reading"
        >
          ⏹️
        </button>
      )}

      {/* Speed control */}
      <div className="relative" ref={speedMenuRef}>
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          onDoubleClick={() => cycleSpeed()}
          className={`${buttonBase} ${buttonTheme} tabular-nums font-mono text-[10px] sm:text-xs min-w-[40px] sm:min-w-[48px] justify-center`}
          title={`Playback speed: ${speed}x (click to choose, double-click to cycle)`}
        >
          {speed}x
        </button>
        {showSpeedMenu && (
          <div
            className={`absolute bottom-full left-0 mb-1 py-1 rounded-lg shadow-lg border z-50 min-w-[80px] ${
              isDark
                ? 'bg-dark-200 border-dark-100 text-gray-200'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setShowSpeedMenu(false);
                  cycleSpeed(s);
                }}
                className={`w-full px-3 py-1.5 text-xs text-left hover:${
                  isDark ? 'bg-dark-300' : 'bg-gray-100'
                } ${speed === s ? 'font-bold text-theme-primary' : ''} transition-colors`}
              >
                {s}x {s === 1 ? '(Normal)' : s >= 1.5 ? '(Fast)' : s <= 0.75 ? '(Slow)' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Share / Download button */}
      <button
        onClick={handleShareText}
        className={`${buttonBase} ${buttonTheme}`}
        title="Download response text (TTS-ready)"
      >
        💾 <span className="hidden sm:inline">Download</span>
      </button>
    </div>
  );
}

