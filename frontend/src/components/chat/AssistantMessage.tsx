import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GraduationCap } from 'lucide-react';
import { DBMessage } from '../../store/db';
import { useChatStore } from '../../store/chatStore';
import { SourcesBar } from './SourcesBar';
import { MessageActions } from './MessageActions';
import { InlineAudioPlayer } from './InlineAudioPlayer';
import { FollowUpChips } from './FollowUpChips';
import { NotFoundCard } from './NotFoundCard';

interface AssistantMessageProps {
  message: DBMessage;
  isStreaming?: boolean;
  onSelectSuggestion: (text: string) => void;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming = false,
  onSelectSuggestion,
}) => {
  const { openCitationDrawer } = useChatStore();

  const displayContent = message.translatedContent || message.content;
  const displayLanguage = message.translatedLanguage || message.language;

  const isNotFound = 
    displayContent.includes("not found in the handbook") || 
    displayContent.includes("கையேட்டில் குறிப்பிடப்படவில்லை") ||
    displayContent.includes("हैंडबुक में नहीं मिला");

  // Custom component replacement for markdown citations [S1], [S2]
  const renderTextWithCitations = (children: React.ReactNode) => {
    if (typeof children !== 'string') return children;

    const parts = children.split(/(\[S\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[S(\d+)\]/);
      if (match) {
        const sourceId = `S${match[1]}`;
        const sourceObj = message.sources?.find(s => s.id === sourceId);
        return (
          <button
            key={i}
            onClick={() => sourceObj && openCitationDrawer(sourceObj)}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-accent-soft text-accent-strong font-mono text-[11px] font-bold border border-accent-border hover:border-accent cursor-pointer transition-all active:scale-95 shadow-soft"
            title={`View source citation ${sourceId}${sourceObj ? ` (Page ${sourceObj.page})` : ''}`}
          >
            {sourceId}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 mb-6 group"
    >
      {/* Institutional Avatar: Navy tile with brass dot */}
      <div className="relative w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-soft mt-0.5">
        <GraduationCap className="w-4 h-4 text-primary-foreground" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Author Label */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-foreground">
            KSRCE Handbook Assistant
          </span>
          <span className="flex items-center gap-1 text-[10px] text-accent-strong font-semibold px-2 py-0.5 rounded-full bg-accent-soft border border-accent-border">
            Verified
          </span>
        </div>

        {/* Not Found Specialized Card */}
        {isNotFound && !isStreaming && (
          <NotFoundCard 
            message={displayContent}
            onSelectTopic={onSelectSuggestion}
          />
        )}

        {/* Markdown Content directly on background */}
        {!isNotFound && (
          <div className="text-xs sm:text-sm text-foreground leading-relaxed max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 leading-relaxed">{renderTextWithCitations(children)}</p>,
                li: ({ children }) => <li className="leading-relaxed">{renderTextWithCitations(children)}</li>,
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto rounded-xl border border-border shadow-soft max-w-full">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-background-subtle text-foreground sticky top-0 font-semibold border-b border-border">
                    {children}
                  </thead>
                ),
                th: ({ children }) => <th className="p-2 sm:p-2.5 font-bold text-foreground">{children}</th>,
                td: ({ children }) => (
                  <td className="p-2 sm:p-2.5 border-t border-border font-mono text-xs text-foreground">{children}</td>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-background-subtle text-foreground border border-border font-mono text-[11px]">
                    {children}
                  </code>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>

            {/* Pulsing Brass Caret when Streaming */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 rounded-sm bg-accent animate-pulse" />
            )}
          </div>
        )}

        {/* Verified Sources Bar */}
        {message.sources && message.sources.length > 0 && (
          <SourcesBar sources={message.sources} />
        )}

        {/* Audio Player */}
        {displayContent && !isStreaming && (
          <div className="mt-2.5">
            <InlineAudioPlayer messageId={message.id} text={displayContent} language={displayLanguage} />
          </div>
        )}

        {/* Message Actions */}
        <MessageActions
          messageId={message.id}
          content={displayContent}
          isStreaming={isStreaming}
        />

        {/* Follow-up Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && !isStreaming && (
          <FollowUpChips
            suggestions={message.suggestions}
            onSelectSuggestion={onSelectSuggestion}
          />
        )}
      </div>
    </motion.div>
  );
};
