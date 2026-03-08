import { Outlet } from "react-router-dom";
import NavSidebar from "../nav-sidebar";
import { ThreeDots } from 'react-loader-spinner';
import { useAuth } from "react-oidc-context";
import { useEffect, Suspense } from "react";
import ProtectedRoute from './protected.jsx'
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";

export default function Root() {
const { t } = useTranslation();
  const auth = useAuth()
  
  useEffect(() => {
    apiClient.bearer = auth.user?.access_token
  }, [auth, auth.user]);


  if (auth.isLoading) {
    console.log(t("verifying_login_status"))
  }

  useEffect(() => {
    console.log(t("current_user_status"), auth.user, t("is_authenticated"), auth.isAuthenticated, t("loading_data"), auth.isLoading);
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
