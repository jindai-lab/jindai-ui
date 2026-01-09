import * as React from "react";
import * as ReactDOM from 'react-dom/client'
import './index.css'
import Root from './routes/root.jsx'
import ErrorPage from './routes/errors.jsx'
import SearchPage from './routes/search.jsx'
import FilePage from './routes/file.jsx'
import SettingsPage from "./routes/settings.jsx";
import HistoryPage from "./routes/history.jsx";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '*',
        element: <SearchPage />,
      },
      {
        path: '/',
        element: <SearchPage />,
      },
      {
        path: 'file/*',
        element: <FilePage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      }
    ]
  },
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
