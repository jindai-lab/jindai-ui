import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { ConfigProvider } from "antd";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import oidc_settings from "./oidc-client-ids.js";

const Root = React.lazy(() => import("./routes/root.jsx"));
const DatasetPage = React.lazy(() => import("./routes/dataset.jsx"));
const ErrorPage = React.lazy(() => import("./routes/errors.jsx"));
const FilePage = React.lazy(() => import("./routes/file.jsx"));
const HistoryPage = React.lazy(() => import("./routes/history.jsx"));
const ImportPage = React.lazy(() => import("./routes/import.jsx"));
const SearchPage = React.lazy(() => import("./routes/search.jsx"));
const TaskPage = React.lazy(() => import("./routes/task.jsx"));
const SettingsPage = React.lazy(() => import("./routes/settings.jsx"));

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
        path: "/silent-renew",
        element: <></>,
      },
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
    ],
  },
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#1AB394"
          },
        }}
      > <React.Suspense fallback={<div>页面加载中...</div>}>
        <RouterProvider router={router} />
        </React.Suspense>
      </ConfigProvider>
    </AuthProvider>
  </React.StrictMode>
);
