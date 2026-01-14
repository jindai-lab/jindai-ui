import { Outlet, useLocation } from "react-router-dom";
import NavSidebar from "../nav-sidebar";
import { ThreeDots } from 'react-loader-spinner';
import { useAuth } from "react-oidc-context";
import { useEffect, Suspense } from "react";
import ProtectedRoute from './protected.jsx'

export default function Root() {
  const auth = useAuth()
  const path = useLocation()

  useEffect(() => {
    console.log("当前用户状态:", auth.user, "是否已认证:", auth.isAuthenticated, "正在载入", auth.isLoading);
  }, [auth.isAuthenticated, auth.user, auth.isLoading, auth.user?.access_token]);

  return (
    <div className="app-container">
      <NavSidebar />
      <main className="main-content">
        <ProtectedRoute>
          <Suspense fallback={<ThreeDots color="var(--primary)" height={50} width={50} />}>
            <Outlet />
          </Suspense>
        </ProtectedRoute>
      </main>
    </div>
  );

}
