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
  export = false

  multiple_servers = true
  app_title = ""
  app_dark = false

  private static handler: ProxyHandler<LocalConfig> = {
  
    get(target: LocalConfig, name: keyof LocalConfig) {
      return target[name];
    },
    set(target: LocalConfig, name: keyof LocalConfig, val: any) {
      switch (typeof target[name]) {
        case "number":
          val = +val;
          break;
        case "boolean":
          val = "" + val == "true";
          break;
      }
      target.set(name, val)
      target.save()
      return true;
    }
    
  }

  constructor(o: Partial<LocalConfig> | string = "") {
    if (typeof o == "string") {
      if (!o.length) o = localStorage.config
    }
    Object.assign(this, o)
    new Proxy(this, LocalConfig.handler)
  }

  save() {
    localStorage.config = JSON.stringify(this);
  }

  set(key: string, val: any) {
    Object(this)[key] = val
  }

}

export default Singletons.get<LocalConfig>(LocalConfig)