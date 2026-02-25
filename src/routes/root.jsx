import { Outlet, useLocation } from "react-router-dom";
import NavSidebar from "../nav-sidebar";
import { ThreeDots } from 'react-loader-spinner';
import { useAuth } from "react-oidc-context";
import { useEffect, Suspense } from "react";
import ProtectedRoute from './protected.jsx'
import { apiClient } from "../api";

export default function Root() {
  const auth = useAuth()
  
  useEffect(() => {
    apiClient.bearer = auth.user?.access_token
  }, [auth, auth.user]);


  if (auth.isLoading) {
    console.log('正在验证登录状态')
  }

  useEffect(() => {
    console.log("当前用户状态:", auth.user, "是否已认证:", auth.isAuthenticated, "正在载入", auth.isLoading);
  }, [auth.isAuthenticated, auth.user, auth.isLoading, auth.user?.access_token]);
  
  return (
    <div className="app-container">
      <NavSidebar user={auth.user} logout={auth.signoutRedirect} />
      <main className="main-content">
        <ProtectedRoute auth={auth}>
          <Suspense fallback={<ThreeDots color="var(--primary)" height={50} width={50} />}>
            {auth.user ? <Outlet /> : <ThreeDots color="var(--primary)" height={50} width={50} />}
          </Suspense>
        </ProtectedRoute>
      </main>
    </div>
  );

}
