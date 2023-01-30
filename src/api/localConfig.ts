import { Singletons } from "./singleton"

export class LocalConfig {
  
  fit = "both"
  drawer = true
  contain = false
  enhance = false
  force_thumbnail = false
  playing_interval = 1000
  view_mode = "list"
  page_size = 50
  tagging = {
    batch_delim: ", ",
    batch_prefix: "#"
  }
  dbconsole = {
    mongocollection: "paragraph",
    history: []
  }
  groups = "none"
  sort = "id"
  expert = false
  selected_datasets = [] as string[]

  multiple_servers = true
  app_title = ""
  app_dark = false

  constructor(o: Partial<LocalConfig> | string = "") {
    if (typeof o == "string") {
      if (!o.length) o = localStorage.config
    }
    Object.assign(this, o)
  }

  save() {
    localStorage.config = JSON.stringify(this);
  }

}

const handler = {
  get(target: object, name: string) {
    return name in target ? target[name as keyof typeof target] : ''
  },
  set(target: object, name: string, value: any) {
    if (name in target) {
      let obj : {[id:string]: typeof value} = {}
      obj[name] = value
      Object.assign(target, obj)
      Singletons.get<LocalConfig>(LocalConfig).save()
      return true
    }
    return false
  }
}

export default new Proxy(Singletons.get<LocalConfig>(LocalConfig), handler) as LocalConfig