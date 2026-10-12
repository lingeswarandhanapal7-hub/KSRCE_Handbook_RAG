import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bn from './locales/bn.json';
import en from './locales/en.json';
import gu from './locales/gu.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import or from './locales/or.json';
import pa from './locales/pa.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import ur from './locales/ur.json';

const resources = {
  'en-IN': { translation: en },
  en: { translation: en },
  'ta-IN': { translation: ta },
  ta: { translation: ta },
  'hi-IN': { translation: hi },
  hi: { translation: hi },
  'te-IN': { translation: te },
  te: { translation: te },
  'ml-IN': { translation: ml },
  ml: { translation: ml },
  'kn-IN': { translation: kn },
  kn: { translation: kn },
  'bn-IN': { translation: bn },
  bn: { translation: bn },
  'mr-IN': { translation: mr },
  mr: { translation: mr },
  'gu-IN': { translation: gu },
  gu: { translation: gu },
  'pa-IN': { translation: pa },
  pa: { translation: pa },
  'ur-IN': { translation: ur },
  ur: { translation: ur },
  'or-IN': { translation: or },
  or: { translation: or },
};

const savedLanguage = localStorage.getItem('ksrce_ui_language') || 'en-IN';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'en-IN',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
