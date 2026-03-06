import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { ConfigProvider } from "antd";
import { theme } from "antd";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import oidc_settings from "./oidc-client-ids.js";

import Root from "./routes/root.jsx";
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
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "*",
        element: <SearchPage />,
      },
      {
        path: "/",
        element: <SearchPage />,
      },
      {
        path: "files/*",
        element: <FilePage />,
      },
      {
        path: "histories",
        element: <HistoryPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "datasets",
        element: <DatasetPage />,
      },
      {
        path: "import",
        element: <ImportPage />,
      },
      {
        path: "tasks",
        element: <TaskPage />,
      },
      {
        path: "tasks/:taskId",
        element: <Workflow />
      }
    ],
  },
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <ThemeConfigProvider><RouterProvider router={router} /></ThemeConfigProvider>
    </AuthProvider>
  </React.StrictMode>
);
