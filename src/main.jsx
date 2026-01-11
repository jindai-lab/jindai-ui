import * as React from "react";
import * as ReactDOM from 'react-dom/client';
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from 'oidc-client-ts';

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import './index.css';
import oidc_settings from "./oidc-client-ids.js"
import Root from './routes/root.jsx';
import DatasetPage from "./routes/dataset.jsx";
import ErrorPage from './routes/errors.jsx';
import FilePage from './routes/file.jsx';
import HistoryPage from "./routes/history.jsx";
import ImportPage from "./routes/import.jsx";
import SearchPage from './routes/search.jsx';
import TaskPage from "./routes/task.jsx";
import SettingsPage from "./routes/settings.jsx";


const oidcConfig = {
  onSigninCallback: () => {
    // Clear URL fragments after login
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  redirect_uri: window.location.origin + '/',
  automaticSilentRenew: true,
  validate_services: true,
  useRefreshToken: true,
  userStore: new WebStorageStateStore({ store: window.localStorage, prefix: 'jindai' }),
  scope: 'openid profile email offline_access',
  ...oidc_settings
};
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/silent-renew',
        element: <></>
      },
      {
        path: '*',
        element: <SearchPage />,
      },
      {
        path: '/',
        element: <SearchPage />,
      },
      {
        path: 'files/*',
        element: <FilePage />,
      },
      {
        path: 'histories',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'datasets',
        element: <DatasetPage />
      },
      {
        path: 'import',
        element: <ImportPage />
      },
      {
        path: 'tasks',
        element: <TaskPage />
      }
    ]
  },
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
