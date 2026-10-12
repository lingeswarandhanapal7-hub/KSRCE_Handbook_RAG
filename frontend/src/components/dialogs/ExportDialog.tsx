import React from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, Printer } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { messages, sessions, activeSessionId } = useChatStore();

  if (!isOpen) return null;

  const currentSession = sessions.find(s => s.id === activeSessionId);
  const title = currentSession?.title || 'ksrce-handbook-chat';

  const formatAsMarkdown = () => {
    let md = `# ${title}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((msg) => {
      const role = msg.role === 'user' ? '### User' : '### KSRCE Handbook Assistant';
      md += `${role}\n\n${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        md += `**Sources:**\n`;
        msg.sources.forEach((s) => {
          md += `- [${s.id}] Page ${s.page}: ${s.section} - "${s.snippet}"\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });
    return md;
  };

  const formatAsText = () => {
    let txt = `${title}\nExported on ${new Date().toLocaleString()}\n\n========================================\n\n`;
    messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      txt += `[${role}]:\n${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        txt += `SOURCES:\n`;
        msg.sources.forEach((s) => {
          txt += `  - [${s.id}] Page ${s.page}: ${s.snippet}\n`;
        });
        txt += `\n`;
      }
      txt += `----------------------------------------\n\n`;
    });
    return txt;
  };

  const downloadFile = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl bg-surface-raised border border-border shadow-soft p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-foreground-muted" />
            <span>Export Conversation</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => downloadFile(formatAsMarkdown(), 'md', 'text/markdown')}
            className="w-full p-3 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-border-strong flex items-center justify-between text-xs font-semibold text-foreground transition-all active:scale-98 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-foreground-muted" />
              <span>Export as Markdown (.md)</span>
            </div>
            <Download className="w-3.5 h-3.5 text-foreground-muted" />
          </button>

          <button
            onClick={() => downloadFile(formatAsText(), 'txt', 'text/plain')}
            className="w-full p-3 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-border-strong flex items-center justify-between text-xs font-semibold text-foreground transition-all active:scale-98 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-foreground-muted" />
              <span>Export as Plain Text (.txt)</span>
            </div>
            <Download className="w-3.5 h-3.5 text-foreground-muted" />
          </button>

          <button
            onClick={() => {
              onClose();
              window.print();
            }}
            className="w-full p-3 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-border-strong flex items-center justify-between text-xs font-semibold text-foreground transition-all active:scale-98 shadow-soft"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-foreground-muted" />
              <span>Print or Save to PDF</span>
            </div>
            <Download className="w-3.5 h-3.5 text-foreground-muted" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
