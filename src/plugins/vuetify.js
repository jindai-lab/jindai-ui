import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import '@mdi/font/css/materialdesignicons.css';
import "@fontsource/roboto";

Vue.use(Vuetify);

import zhHans from 'vuetify/lib/locale/zh-Hans'
import zhHant from 'vuetify/lib/locale/zh-Hant'
import en from 'vuetify/lib/locale/en'
import ja from 'vuetify/lib/locale/ja'

export default new Vuetify({
    icons: { iconfont: 'mdi' },
    lang: {
        locales: { zhHans, zhHant, en, ja },
        current: 'zhHans',
      },
});
