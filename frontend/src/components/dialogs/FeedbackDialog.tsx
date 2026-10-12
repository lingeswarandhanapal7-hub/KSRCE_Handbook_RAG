import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Send, Check } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { submitFeedback } from '../../lib/api';

export const FeedbackDialog: React.FC = () => {
  const { isFeedbackOpen, activeFeedbackMessageId, setFeedbackOpen } = useChatStore();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFeedbackOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackMessageId) return;

    setIsSubmitting(true);
    try {
      await submitFeedback(activeFeedbackMessageId, rating, comment);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFeedbackOpen(false);
      }, 1500);
    } catch {
      // Done anyway
      setFeedbackOpen(false);
    } finally {
      setIsSubmitting(false);
    }
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
          <h3 className="text-sm font-bold text-foreground">Provide Feedback</h3>
          <button
            onClick={() => setFeedbackOpen(false)}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto border border-success/30">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">Thank you for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-foreground-muted block mb-2">Rating</label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 text-accent hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? 'fill-accent text-accent' : 'text-border'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground-muted block mb-1">Comments (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How can this handbook response be improved?"
                rows={3}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 shadow-soft active:scale-98 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Feedback</span>
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
