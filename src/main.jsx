import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { ConfigProvider } from "antd";
import { theme } from "antd";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import oidc_settings from "./oidc-client-ids.js";

// 插件系统相关导入
import { PluginManager } from './plugin/PluginManager';
import { PluginLoader } from './plugin/PluginLoader';
import pluginConfig from './plugins.json';
import { apiClient } from './api';

import Root from "./routes/root.jsx";
const ApiKeysPage = React.lazy(() => import("./routes/apikeys.jsx"));
// Dynamic import for fallback - plugins may override this
const FallbackBibliothekPage = React.lazy(() => import("./routes/bibliothek.jsx"));
const DatasetPage = React.lazy(() => import("./routes/dataset.jsx"));
const ErrorPage = React.lazy(() => import("./routes/errors.jsx"));
const FilePage = React.lazy(() => import("./routes/file.jsx"));
const HistoryPage = React.lazy(() => import("./routes/history.jsx"));
const ImportPage = React.lazy(() => import("./routes/import.jsx"));
const SearchPage = React.lazy(() => import("./routes/search.jsx"));
const TaskPage = React.lazy(() => import("./routes/task.jsx"));
const SettingsPage = React.lazy(() => import("./routes/settings.jsx"));
const Workflow = React.lazy(() => import("./routes/workflow.jsx"));

const { useToken } = theme;

// 主题上下文
export const ThemeContext = React.createContext();

// 主题配置组件
const ThemeConfigProvider = ({children}) => {
  const [themeMode, setThemeMode] = React.useState("auto");
  
  // 从 localStorage 获取主题设置
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("jindai-theme");
    if (savedTheme) {
      setThemeMode(savedTheme);
    }
  }, []);

  // 根据主题模式返回 Ant Design 主题配置
  const getAntdTheme = () => {
    const isDark = themeMode === "dark" || (themeMode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return {
      token: {
        colorPrimary: "#1AB394",
        colorBgContainer: isDark ? "#1f2937" : "#ffffff",
        colorBgLayout: isDark ? "#181818" : "#f5f7fa",
        colorTextBase: isDark ? "#e2e8f0" : "#2f4050",
        colorBorder: isDark ? "#374151" : "#e6e6e6",
        colorText: isDark ? "#e2e8f0" : "#2f4050",
      },
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    };
  };

  const handleThemeChange = (newTheme) => {
    setThemeMode(newTheme);
    localStorage.setItem("jindai-theme", newTheme);
  };

  return (
    <ConfigProvider theme={getAntdTheme()}>
      <ThemeContext.Provider value={{ themeMode, setTheme: handleThemeChange }}>
        {children}
      </ThemeContext.Provider>
    </ConfigProvider>
  );
};

const oidcConfig = {
  onSigninCallback: () => {
    // Clear URL fragments after login
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  redirect_uri: window.location.origin + "/",
  automaticSilentRenew: true,
  validate_services: true,
  useRefreshToken: true,
  userStore: new WebStorageStateStore({
    store: window.localStorage,
    prefix: "jindai",
  }),
  scope: "openid profile email offline_access",
  ...oidc_settings,
};

// 创建插件管理器
const pluginManager = new PluginManager({
  apiClient,
  registerRoute: (route) => { /* 注册路由 */ },
  registerComponent: (name, component) => { /* 注册组件 */ },
  registerI18nResources: (lang, resources) => { /* 注册国际化 */ },
  registerConfig: (config) => { /* 注册配置 */ },
  theme: ThemeContext
});

// 加载插件
const loadPlugins = async () => {
  const pluginLoader = new PluginLoader();
  
  for (const pluginConfigItem of pluginConfig.plugins) {
    if (pluginConfigItem.enabled) {
      try {
        const plugin = await pluginLoader.loadFromConfig(pluginConfigItem);
        await pluginManager.register(plugin);
      } catch (error) {
        console.error(`Failed to load plugin: ${pluginConfigItem.source}`, error);
      }
    }
  }
};

// 创建路由
const createAppRoutes = () => {
  const baseRoutes = [
    { path: '*', element: <SearchPage /> },
    { path: '/', element: <SearchPage /> },
    { path: 'files/*', element: <FilePage /> },
    { path: 'histories', element: <HistoryPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'manageapikeys', element: <ApiKeysPage /> },
    { path: 'datasets', element: <DatasetPage /> },
    { path: 'import', element: <ImportPage /> },
    { path: 'tasks', element: <TaskPage /> },
    { path: 'tasks/:taskId', element: <Workflow /> }
  ];
  
  // 添加插件路由 - 插件路由会覆盖基础路由
  const pluginRoutes = pluginManager.getRoutes();
  
  // 创建一个映射来跟踪哪些路径已被插件路由覆盖
  const pluginRoutePaths = new Set(pluginRoutes.map(route => route.path));
  
  // 过滤掉被插件覆盖的基础路由
  const filteredBaseRoutes = baseRoutes.filter(route => !pluginRoutePaths.has(route.path));
  
  return [
    {
      path: '/',
      element: <Root />,
      errorElement: <ErrorPage />,
      children: [
        ...filteredBaseRoutes,
        ...pluginRoutes
      ]
    }
  ];
};

// 加载插件并创建应用
loadPlugins().then(() => {
  // 扩展 API 客户端
  const extendedApiClient = pluginManager.extendApiClient(apiClient);
  
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <AuthProvider {...oidcConfig}>
          <ThemeConfigProvider><RouterProvider router={createBrowserRouter(createAppRoutes())} /></ThemeConfigProvider>
        </AuthProvider>
      </I18nextProvider>
    </React.StrictMode>
  );
});

// Expose i18n instance to global window for use in api.js
window.i18nInstance = (key) => i18n.t(key);
