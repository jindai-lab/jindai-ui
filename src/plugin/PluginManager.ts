// src/plugin/PluginManager.ts

import { Plugin, RouteConfig, AppContext, RoutePlugin, APIExtensionPlugin, I18nPlugin, ComponentPlugin } from '../types/plugin';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private routes: RouteConfig[] = [];
  private apiExtensions: Array<(api: any) => any> = [];
  private i18nResources: Map<string, any> = new Map();
  private components: Map<string, any> = new Map(); // 使用 any 类型避免 React 类型问题
  
  constructor(private appContext: AppContext) {}
  
  // 注册插件
  async register(plugin: Plugin): Promise<void> {
    const { name, version } = plugin.metadata;
    
    console.log(`Registering plugin: ${name}@${version}`);
    
    // 初始化插件
    if (plugin.init) {
      await plugin.init(this.appContext);
    }
    
    this.plugins.set(name, plugin);
    
    // 处理插件扩展
    this.processPluginExtensions(plugin);
  }
  
  // 处理插件扩展
  private processPluginExtensions(plugin: Plugin): void {
    // 路由扩展
    if ('routes' in plugin) {
      this.routes.push(...(plugin as RoutePlugin).routes);
    }
    
    // API 扩展
    if ('extendApiClient' in plugin) {
      this.apiExtensions.push((plugin as APIExtensionPlugin).extendApiClient);
    }
    
    // 国际化扩展
    if ('resources' in plugin) {
      const i18nPlugin = plugin as I18nPlugin;
      Object.entries(i18nPlugin.resources).forEach(([lang, resources]) => {
        this.i18nResources.set(lang, {
          ...this.i18nResources.get(lang),
          ...resources
        });
      });
    }
    
    // 组件注册
    if ('components' in plugin) {
      Object.entries((plugin as ComponentPlugin).components).forEach(([name, component]) => {
        this.components.set(name, component);
      });
    }
  }
  
  // 获取路由
  getRoutes(): RouteConfig[] {
    return this.routes;
  }
  
  // 扩展 API 客户端
  extendApiClient(originalApiClient: any): any {
    let apiClient = originalApiClient;
    this.apiExtensions.forEach(extend => {
      apiClient = extend(apiClient);
    });
    return apiClient;
  }
  
  // 获取国际化资源
  getI18nResources(): Record<string, any> {
    const resources: Record<string, any> = {};
    this.i18nResources.forEach((resourcesObj, lang) => {
      resources[lang] = resourcesObj;
    });
    return resources;
  }
  
  // 获取注册的组件
  getComponent(name: string): any | undefined {
    return this.components.get(name);
  }
  
  // 获取所有组件
  getAllComponents(): Map<string, any> {
    return this.components;
  }
}