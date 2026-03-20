import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
const jsons = import.meta.glob('./locales/*.json', { eager: true });
const resources = Object.entries(jsons).reduce((acc, [path, module]) => {
  // 从文件路径中提取语言代码，例如 './locales/en.json' 提取出 'en'
  const lang = path.match(/\.\/locales\/(.*)\.json$/)?.[1];
  if (lang) {
    acc[lang] = module.default;
  }
  return acc;
}, {});
// Default language is Simplified Chinese
const defaultLanguage = 'zh-CN';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLanguage,
    lng: defaultLanguage,
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    resources,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
