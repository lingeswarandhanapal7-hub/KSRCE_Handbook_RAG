import React from 'react';
import { ShieldAlert, BookOpen } from 'lucide-react';

interface NotFoundCardProps {
  message?: string;
  relatedTopics?: string[];
  onSelectTopic?: (topic: string) => void;
}

export const NotFoundCard: React.FC<NotFoundCardProps> = ({
  message,
  relatedTopics = ['Academic Regulations', 'Attendance Condonation', 'Examination Rules', 'Hostel Guidelines'],
  onSelectTopic,
}) => {
  return (
    <div className="my-3 p-4 rounded-xl bg-background-subtle border-l-2 border-warning border-y border-r border-border text-foreground text-xs space-y-3 shadow-soft">
      <div className="flex items-center gap-2 text-warning font-semibold text-sm">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Information Not Found in Handbook</span>
      </div>

      <p className="leading-relaxed text-foreground-secondary">
        {message || "The requested query could not be verified within the official handbook. As an institution-grounded assistant, responses are strictly restricted to verified handbook guidelines."}
      </p>

      {/* Closest related topics */}
      <div className="pt-2 border-t border-border">
        <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider block mb-2">
          Explore Available Handbook Sections:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {relatedTopics.map((topic, idx) => (
            <button
              key={idx}
              onClick={() => onSelectTopic && onSelectTopic(`Tell me about ${topic}`)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-raised border border-border hover:border-border-strong text-[11px] font-medium text-foreground transition-all active:scale-95 shadow-soft"
            >
              <BookOpen className="w-3 h-3 text-foreground-muted" />
              <span>{topic}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
