import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, BookOpen, GraduationCap } from 'lucide-react';

interface WelcomeHeroProps {
  handbookTitle?: string;
}

const GREETINGS = [
  { lang: 'English', text: 'Welcome to KSRCE Handbook Assistant', sub: 'Ask anything about regulations, fees, exams, or attendance' },
  { lang: 'Tamil', text: 'கே.எஸ்.ஆர்.சி.இ வழிகாட்டிக்கு நல்வரவு', sub: 'விதிமுறைகள், தேர்வுகள், வருகைப்பதிவு மற்றும் கட்டணம் பற்றி கேளுங்கள்' },
  { lang: 'Hindi', text: 'केएसआरसीई हैंडबुक सहायक में आपका स्वागत है', sub: 'नियमों, परीक्षाओं, उपस्थिति और शुल्क के बारे में कोई भी प्रश्न पूछें' },
  { lang: 'Telugu', text: 'కెఎస్ఆర్సిఇ హ్యాండ్‌బుక్ అసిస్టెంట్‌కి స్వాగతం', sub: 'నిబంధనలు, పరీక్షలు, హాజరు మరియు ఫీజుల గురించి అడగండి' },
  { lang: 'Malayalam', text: 'കെ.എസ്.ആർ.സി.ഇ അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം', sub: 'നിയമങ്ങൾ, പരീക്ഷകൾ, ഹാജർ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക' },
  { lang: 'Kannada', text: 'ಕೆ.എസ്.ಆರ್.ಸಿ.ಇ ಸಹಾಯಕಕ್ಕೆ ಸುಸ್ವಾಗತ', sub: 'ನಿಯಮಗಳು, ಪರೀಕ್ಷೆಗಳು ಮತ್ತು ಹಾಜರಾತಿ ಬಗ್ಗೆ ಪ್ರಶ್ನಿಸಿ' },
];

export const WelcomeHero: React.FC<WelcomeHeroProps> = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = GREETINGS[index];

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8 max-w-2xl mx-auto">
      {/* Refined Academic Logo Mark: Navy tile, ivory glyph, brass dot */}
      <div className="mb-6 flex flex-col items-center">
        <motion.div
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-soft mb-3"
        >
          <GraduationCap className="w-8 h-8 text-primary-foreground" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent" />
        </motion.div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-[11px] text-foreground-secondary font-medium shadow-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>Strictly Grounded Institutional Assistant</span>
        </div>
      </div>

      {/* Multilingual Greeting (Solid foreground, language badge in accent-strong) */}
      <div className="min-h-[96px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {current.text}
            </h2>
            <span className="text-xs font-semibold text-accent-strong mt-1">
              {current.lang}
            </span>
            <p className="text-xs sm:text-sm text-foreground-muted mt-1 max-w-md">
              {current.sub}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Trust Badges */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-foreground-muted">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border shadow-soft">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>Zero Hallucination Policy</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border shadow-soft">
          <BookOpen className="w-3.5 h-3.5 text-accent" />
          <span>Every Answer Cited with Page #</span>
        </div>
      </div>
    </div>
  );
};
