import PromptChoicesDialog from "./PromptChoicesDialog.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import BatchTagsDialog from "./BatchTagsDialog.vue"
import InfoDialog from "./InfoDialog.vue"
import SendTaskDialog from "./SendTaskDialog.vue"
import EmbeddedDialog from "./EmbeddedDialog.vue"
import EditDialog from "./EditDialog.vue"
import AlertDialog from "./AlertDialog.vue"

import Vue from "vue";
import i18n from "@/locales";
import vuetify from "@/plugins/vuetify.js";

export default {

    _create_dialog(class_, options) {
        return new Promise((resolve, reject) => {
            var installed = Vue.extend(class_)
            var component = new installed({
                i18n,
                vuetify,
                propsData: { ...options }
            }).$mount();
            var el = document.getElementById('app').appendChild(component.$el);
            var launcher = document.createElement('button')
            launcher.setAttribute('id', '_btn_launcher');
            launcher.style.visibility = 'hidden';
            launcher.click();
            launcher.remove();

            component.$watch('retval', function (value) {
                el.remove();
                if (value === false || value === null || typeof value === 'undefined')
                    reject(value);
                else
                    resolve(value);
            })
        })
    },

    confirm(options) {
        return this._create_dialog(ConfirmDialog, options);
    },

    prompt(options) {
        return this._create_dialog(PromptChoicesDialog, options);
    },

    batch_tagging(options) {
        return this._create_dialog(BatchTagsDialog, options)
    },

    info(options) { return this._create_dialog(InfoDialog, options) },
    send_task(options) { return this._create_dialog(SendTaskDialog, options) },
    embedded(options) { return this._create_dialog(EmbeddedDialog, options) },
    edit(options) { return this._create_dialog(EditDialog, options) },
    alert(options) { return this._create_dialog(AlertDialog, options) },
}
