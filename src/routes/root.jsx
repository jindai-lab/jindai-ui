import { Outlet, useLocation } from "react-router-dom";
import NavSidebar from "../nav-sidebar";
import { ThreeDots } from 'react-loader-spinner';
import { useAuth } from "react-oidc-context";
import { useEffect, Suspense } from "react";
import ProtectedRoute from './protected.jsx'
import { apiClient } from "../api"; // 之前创建的 Axios Hook

export default function Root() {
  const auth = useAuth()
  const path = useLocation()
  
  useEffect(() => {
    const requestIntercept = apiClient.interceptors.request.use(
      (config) => {
        if (auth.user?.access_token) {
          config.headers.Authorization = `Bearer ${auth.user.access_token}`;
          apiClient.bearer = auth.user.access_token
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    return () => {
      apiClient.interceptors.request.eject(requestIntercept);
    };
  }, [auth.user]);


  useEffect(() => {
    console.log("当前用户状态:", auth.user, "是否已认证:", auth.isAuthenticated, "正在载入", auth.isLoading);
  }, [auth.isAuthenticated, auth.user, auth.isLoading, auth.user?.access_token]);
  
  return (
    <div className="app-container">
      <NavSidebar user={auth.user} logout={auth.signoutRedirect} />
      <main className="main-content">
        <ProtectedRoute auth={auth}>
          <Suspense fallback={<ThreeDots color="var(--primary)" height={50} width={50} />}>
            <Outlet />
          </Suspense>
        </ProtectedRoute>
      </main>
    </div>
  );

}
