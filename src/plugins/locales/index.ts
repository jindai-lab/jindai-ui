import { createI18n } from 'vue-i18n'

const DEFAULT_LANG = "zhs";
const LOCALE_KEY = "__locale";

import zhs from "./zhs.json"
import zht from "./zht.json"
import en from "./en.json"
import ja from "./ja.json"

const messages = {
    zhs,zht,en,ja
};

const i18n = createI18n({
    locale: DEFAULT_LANG,
    messages,
    fallbackLocale: "en"
});

export const setup = (lang: string) => {
    if (lang === undefined) {
        lang = window.localStorage.getItem(LOCALE_KEY) ?? DEFAULT_LANG;
    }
    window.localStorage.setItem(LOCALE_KEY, lang);
    document.body.setAttribute("lang", lang);
};

export default i18n;