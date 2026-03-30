import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  "Reading between the lines...",
  "Brewing a strong opinion...",
  "Scribbling notes in the margin...",
  "Connecting some interesting dots...",
  "Raising an eyebrow at this one...",
  "Choosing words carefully...",
  "Thinking out loud for a moment...",
  "Cross-referencing with lived experience...",
  "Drafting, deleting, re-drafting...",
  "Almost there, just polishing the edges...",
];

const CHAR_DELAY = 30;
const PAUSE_AFTER = 2000;

interface AiTypingIndicatorProps {
  compact?: boolean;
}

export default function AiTypingIndicator({ compact = false }: AiTypingIndicatorProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [pausing, setPausing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const msg = MESSAGES[msgIndex];

    if (pausing) {
      timerRef.current = setTimeout(() => {
        setPausing(false);
        setCharIndex(0);
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
      }, PAUSE_AFTER);
    } else if (charIndex < msg.length) {
      timerRef.current = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, CHAR_DELAY);
    } else {
      setPausing(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [charIndex, msgIndex, pausing]);

  const displayed = MESSAGES[msgIndex].slice(0, charIndex);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="accent-dot" style={{ width: 6, height: 6 }} />
        {displayed}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 py-4 text-sm text-muted">
      <span className="accent-dot" />
      {displayed}
    </div>
  );
}
