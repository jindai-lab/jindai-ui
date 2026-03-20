import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'zh-CN'],
  extract: {
    input: 'src/**/*.{js,jsx}', // Files to scan
    output: 'src/locales/{{language}}.json', // Output path for translation files
    mergeNamespaces: true,
    keySeparator: false,
    functions: ['t', 'i18n.t'], // Custom functions to look for
    primaryLanguage: 'zh-CN',
    secondaryLanguages: ['en'],
  },
});
