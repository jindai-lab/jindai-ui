import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import '@mdi/font/css/materialdesignicons.css';
import "@fontsource/roboto";

Vue.use(Vuetify);

export default new Vuetify({
    icons: { iconfont: 'mdi' }
});
