import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Edit2, Copy, Check } from 'lucide-react';
import { DBMessage } from '../../store/db';

interface UserMessageProps {
  message: DBMessage;
  onEditResend: (newText: string) => void;
}

export const UserMessage: React.FC<UserMessageProps> = ({ message, onEditResend }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== message.content) {
      onEditResend(editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex justify-end mb-4 group"
    >
      <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
        {/* Actions bar on hover */}
        {!isEditing && (
          <div className="flex items-center gap-1.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-muted text-[11px] pr-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:text-foreground hover:bg-foreground/[0.04] rounded"
              title="Edit and ask again"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1 hover:text-foreground hover:bg-foreground/[0.04] rounded"
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Message Bubble: user-bubble */}
        <div className="relative p-3.5 sm:p-4 rounded-2xl rounded-tr-sm bg-user-bubble text-user-bubble-foreground shadow-soft text-xs sm:text-sm leading-relaxed">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full p-2 rounded-xl bg-surface text-foreground text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-ring border border-border resize-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-foreground hover:bg-foreground/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-soft"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}

          {/* Voice Dictated Badge */}
          {message.dictated && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-user-bubble-foreground/75">
              <Mic className="w-2.5 h-2.5" />
              <span>Voice Dictated</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
