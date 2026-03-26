// types/plugin.d.ts

export interface PluginMetadata {
  name: string;              // 插件名称
  version: string;           // 版本号
  description?: string;      // 描述
  author?: string;           // 作者
  dependencies?: string[];   // 依赖的其他插件
}

export interface Plugin {
  metadata: PluginMetadata;
  
  // 可选：初始化插件
  init?(app: AppContext): void;
  
  // 可选：清理插件
  destroy?(): void;
}

export interface AppContext {
  apiClient: any; // 使用 any 类型，因为实际类型可能根据项目而变化
  registerRoute: (route: RouteConfig) => void;
  registerComponent: (name: string, component: React.ComponentType) => void;
  registerI18nResources: (lang: string, resources: any) => void;
  registerConfig: (config: PluginConfig) => void;
  theme: any; // 主题上下文
}

export interface RoutePlugin extends Plugin {
  routes: RouteConfig[];
}

export interface RouteConfig {
  path: string;
  element: React.LazyExoticComponent<React.FC> | React.ComponentType;
  title?: string;              // 用于导航栏
  icon?: React.ReactNode;      // 用于导航栏图标
  sidebar?: boolean;           // 是否显示在侧边栏
  protected?: boolean;         // 是否需要认证
}

export interface APIExtensionPlugin extends Plugin {
  extendApiClient(apiClient: any): any;
}

export interface I18nPlugin extends Plugin {
  resources: {
    [lang: string]: {
      translation: {
        [key: string]: string;
      };
    };
  };
}

export interface ComponentPlugin extends Plugin {
  components: {
    [name: string]: React.ComponentType;
  };
}

export interface PluginConfig {
  type: 'npm' | 'local' | 'cdn';
  source: string;
  enabled: boolean;
}
