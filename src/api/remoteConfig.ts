import { Meta, TaskDBO, PluginPage, Pipelines, PipelineStage } from "./dbo"
import localConfig from "./localConfig"
import { call } from "./net"
import { Singletons } from "./singleton"

type Languages = { [name: string]: string }

class RemoteConfig {
  
  _promises: Promise<void>
  meta: Meta = { app_dark: false, app_title: '', domain_delimiter: '.', multi_servers: false }
  taskShortcuts: TaskDBO[] = []
  plugin_pages: PluginPage[] = []
  pipelines: Pipelines = {}
  languages: Languages = {}
  _initialized: boolean = false

  constructor() {
    this._promises = Promise.all([
      call<Meta>('meta').then(
        data => {
          this.meta = data
          localConfig.app_dark = data.app_dark
          localConfig.app_title = data.app_title
        }),
      call<PluginPage[]>('plugins/filters').then(
        data => this.plugin_pages = data),
      call<Pipelines>("help/pipelines").then(data => this.pipelines = data),
      call<Languages>("help/langs").then(data => this.languages = data)
    ]).then(() => {
      this._initialized = true
    })
  }
  
  get initialized() {
    return this._initialized
  }

  get piplineDirectory() {
    var obj: {[name:string]: PipelineStage} = {}
    Object.assign(obj, ... Object.values(this.pipelines))
    return obj
  }

  async wait() {
    if (!this._initialized)
      await this._promises
  }
}

export default Singletons.get<RemoteConfig>(RemoteConfig)
