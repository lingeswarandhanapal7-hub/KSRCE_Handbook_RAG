import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Volume2, 
  RotateCw, 
  Languages, 
  ThumbsUp, 
  ThumbsDown 
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { SUPPORTED_LANGUAGES } from '../layout/LanguageSelector';

interface MessageActionsProps {
  messageId: string;
  content: string;
  onListen?: () => void;
  isStreaming?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  onListen,
  isStreaming = false,
}) => {
  const { 
    regenerateMessage, 
    translateMessageInPlace, 
    setFeedbackOpen,
    recordFeedback 
  } = useChatStore();

  const [copied, setCopied] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  if (isStreaming) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleFeedback = (rating: 1 | 5) => {
    setFeedbackGiven(rating === 5 ? 'up' : 'down');
    recordFeedback(messageId, rating);
    if (rating === 1) {
      setFeedbackOpen(true, messageId);
    }
  };

  const handleTranslate = (langCode: string) => {
    setTranslateOpen(false);
    translateMessageInPlace(messageId, langCode);
  };

  return (
    <div className="flex items-center gap-1 mt-2 text-foreground-muted text-xs">
      {/* Copy */}
      <button
        onClick={handleCopy}
        title="Copy response"
        className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {/* Listen */}
      {onListen && (
        <button
          onClick={onListen}
          title="Read aloud"
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Regenerate */}
      <button
        onClick={() => regenerateMessage(messageId)}
        title="Regenerate answer"
        className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      {/* Translate In-Place Dropdown */}
      <div className="relative">
        <button
          onClick={() => setTranslateOpen(!translateOpen)}
          title="Translate answer into another language"
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors flex items-center gap-1"
        >
          <Languages className="w-3.5 h-3.5" />
        </button>

        {translateOpen && (
          <div className="absolute left-0 bottom-7 w-48 max-h-56 overflow-y-auto bg-surface-raised border border-border rounded-xl shadow-soft p-1.5 z-30 custom-scrollbar">
            <div className="text-[10px] font-bold text-foreground-muted uppercase px-2 py-1">
              Translate To:
            </div>
            {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map((l) => (
              <button
                key={l.code}
                onClick={() => handleTranslate(l.code)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-background-subtle flex items-center justify-between"
              >
                <span className="font-semibold text-foreground">{l.nativeName}</span>
                <span className="text-[10px] text-foreground-muted">{l.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thumbs Up */}
      <button
        onClick={() => handleFeedback(5)}
        title="Helpful answer"
        className={`p-1.5 rounded-lg transition-colors ${
          feedbackGiven === 'up' ? 'text-success bg-success/10' : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>

      {/* Thumbs Down */}
      <button
        onClick={() => handleFeedback(1)}
        title="Report issue or unhelpful answer"
        className={`p-1.5 rounded-lg transition-colors ${
          feedbackGiven === 'down' ? 'text-danger bg-danger/10' : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
