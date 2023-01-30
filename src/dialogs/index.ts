import { App, createVNode, DefineComponent, render } from "vue";
import i18n from "@/plugins/locales";
import vuetify from "@/plugins/vuetify.js";

import AlertDialog from "./AlertDialog.vue"
import PromptChoicesDialog from "./PromptChoicesDialog.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import BatchTagsDialog from "./BatchTagsDialog.vue"
import InfoDialog from "./InfoDialog.vue"
import SendTaskDialog from "./SendTaskDialog.vue"
import EmbeddedDialog from "./EmbeddedDialog.vue"
import EditDialog from "./EditDialog.vue"

const _els: DefineComponent[] = []

type ChoiceItem = { text: string, value: string }

type ChoicesFunction = (search: string, options: DialogOptions) => ChoiceItem[]

type DialogOptions = {
  title?: string,
  values?: string[],
  choices?: string[] | ChoiceItem[] | ChoicesFunction
  content?: string,
  typing?: string,
  bundle?: object
}

type DialogName = "info" | "confirm" | "prompt" | "batch-tagging" | "send-task" | "embedded" | "edit" | "alert"

const plugin = {
  install(app: App) {
    app.provide('$dialog', (name: DialogName,
      options: DialogOptions) => this.create_dialog(name, options))
      .provide('$notify', (content: string, bundle: object) => this.create_dialog('Alert', { content, bundle }));
  },

  create_dialog,

  close: close_dialogs
}

export function create_dialog<T = object>(name: string, options: DialogOptions) {
  let component: DefineComponent

  switch (name) {
    case "info": component = InfoDialog; break;
    case "confirm": component = ConfirmDialog; break;
    case "prompt": component = PromptChoicesDialog; break;
    case "batch-tagging": component = BatchTagsDialog; break;
    case "send-task": component = SendTaskDialog; break;
    case "embedded": component = EmbeddedDialog; break;
    case "edit": component = EditDialog; break;
    default: component = AlertDialog; break;
  }

  return new Promise<T>((resolve, reject) => {

    let appEl = document.getElementById('app')
    if (appEl) {
      var el = appEl.appendChild(document.createElement('div'))
      _els.push(component)

      let vnode = createVNode(component, options)
      render(vnode, el)

      component.$on('input', function (value: any) {
        render(null, el)
        el.remove();
        _els.splice(_els.indexOf(component), 1)
        if (value === false || value === null || typeof value === 'undefined')
          reject(value);
        else
          resolve(value as T);
      })
    }
  })

}

export function close_dialogs() {
  _els.forEach(x => x.$emit('input', false))
}

export function notify(text: string, bundle?: object) {
  create_dialog('alert', { content: text, bundle })
}

export default plugin;
