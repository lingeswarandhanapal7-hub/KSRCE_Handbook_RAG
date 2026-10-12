import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { WelcomeHero } from './WelcomeHero';
import { SuggestedQuestions } from './SuggestedQuestions';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { StageStatus } from './StageStatus';

interface MessageListProps {
  onSelectSuggestion: (text: string) => void;
  onEditResend: (newText: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  onSelectSuggestion,
  onEditResend,
}) => {
  const { 
    messages, 
    isStreaming, 
    activeStage, 
    streamedContent, 
    activeSources, 
    followUpSuggestions,
    activeSessionId
  } = useChatStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  // Handle scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isUp = distanceFromBottom > 120;
    setShowScrollBottom(isUp);
    setUserHasScrolledUp(isUp);
  };

  // Auto-scroll on new messages or streamed tokens, only if user hasn't scrolled up
  useEffect(() => {
    if (!userHasScrolledUp && bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamedContent, activeStage, userHasScrolledUp]);

  const scrollToBottom = () => {
    setUserHasScrolledUp(false);
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isEmpty = messages.length === 0 && !isStreaming && !activeStage;

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar relative"
    >
      <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-between">
        {isEmpty ? (
          <div className="my-auto py-8">
            <WelcomeHero />
            <SuggestedQuestions onSelectQuestion={onSelectSuggestion} />
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <UserMessage
                    key={msg.id}
                    message={msg}
                    onEditResend={onEditResend}
                  />
                );
              }
              return (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  onSelectSuggestion={onSelectSuggestion}
                />
              );
            })}

            {/* In-Flight Pipeline Stage Status */}
            {activeStage && (
              <StageStatus stageInfo={activeStage} />
            )}

            {/* Currently Streaming Message */}
            {isStreaming && streamedContent && (
              <AssistantMessage
                key="streaming_active"
                message={{
                  id: 'streaming_temp',
                  sessionId: activeSessionId || 'default',
                  role: 'assistant',
                  content: streamedContent,
                  sources: activeSources,
                  suggestions: followUpSuggestions,
                  createdAt: Date.now(),
                }}
                isStreaming={true}
                onSelectSuggestion={onSelectSuggestion}
              />
            )}

            <div ref={bottomAnchorRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Floating Jump to Latest Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={scrollToBottom}
            className="fixed bottom-24 right-6 sm:right-10 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-card/90 backdrop-blur-md border border-brand-primary/40 text-text-primary text-xs font-medium shadow-lg hover:bg-surface-elevated active:scale-95 transition-all"
          >
            <ArrowDown className="w-3.5 h-3.5 text-brand-primary animate-bounce" />
            <span>Latest</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
