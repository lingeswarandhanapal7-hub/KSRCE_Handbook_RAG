import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RotateCw, 
  BookOpen, 
  Clock, 
  Award, 
  CreditCard, 
  Home, 
  ShieldAlert,
  FileText
} from 'lucide-react';
import { fetchSuggestions } from '../../lib/api';
import { useSettingsStore } from '../../store/settingsStore';

interface SuggestedQuestionsProps {
  onSelectQuestion: (text: string) => void;
}

interface QuestionItem {
  question: string;
  category: string;
}

const DEFAULT_QUESTIONS: QuestionItem[] = [
  { question: "What are the minimum attendance requirements for appearing in semester exams?", category: "Attendance" },
  { question: "What is the procedure and medical certificate rule for attendance condonation?", category: "Attendance" },
  { question: "How is the CGPA and GPA calculated under the academic regulations?", category: "Academics" },
  { question: "What are the rules and penalties regarding dress code and discipline on campus?", category: "Rules" },
  { question: "What is the fee payment schedule and fine policy for delayed payment?", category: "Fees" },
  { question: "What are the hostel rules, mess timings, and study hours?", category: "Hostel" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Academics: <BookOpen className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground-secondary" />,
  Attendance: <Clock className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground-secondary" />,
  Exams: <Award className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground-secondary" />,
  Fees: <CreditCard className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground-secondary" />,
  Hostel: <Home className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground-secondary" />,
  Rules: <ShieldAlert className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground-secondary" />,
};

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelectQuestion }) => {
  const { answerLanguage } = useSettingsStore();
  const [questions, setQuestions] = useState<QuestionItem[]>(DEFAULT_QUESTIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSuggestions(answerLanguage);
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
      }
    } catch {
      // Fallback stays as default
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [answerLanguage]);

  const categories = ['All', ...Array.from(new Set(questions.map(q => q.category)))];

  const filtered = selectedCategory === 'All' 
    ? questions 
    : questions.filter(q => q.category === selectedCategory);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-2">
      {/* Category Chips + Refresh */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'bg-transparent text-foreground-secondary hover:text-foreground hover:bg-foreground/[0.04] border border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={loadQuestions}
          disabled={isLoading}
          title="Refresh suggestions"
          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-colors shrink-0"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filtered.slice(0, 6).map((item, index) => {
          return (
            <motion.button
              key={`${item.question}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              onClick={() => onSelectQuestion(item.question)}
              className="group text-left p-3.5 rounded-2xl bg-surface border border-border hover:border-border-strong hover:-translate-y-0.5 shadow-soft transition-all duration-150 active:scale-[0.99] flex flex-col justify-between gap-2.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground-muted group-hover:text-foreground-secondary transition-colors">
                  {CATEGORY_ICONS[item.category] || <FileText className="w-3.5 h-3.5 text-foreground-muted" />}
                  <span>{item.category}</span>
                </div>
              </div>

              <p className="text-xs font-medium text-foreground leading-relaxed line-clamp-2">
                {item.question}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
