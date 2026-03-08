import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { ThreeDots } from "react-loader-spinner";
import { useTranslation } from "react-i18next";

const ProtectedRoute = ({auth}) => {
const { t } = useTranslation();
  if (auth.isLoading) {
    console.log(t("verifying_login_status"))
    return null;
  }

  if (!auth.isAuthenticated) {
    // 如果未登录，跳转到登录页，或者直接触发 signinRedirect
    auth.signinRedirect();
    return null;
  }

  return (
    !auth.isLoading && auth.isAuthenticated && (<Outlet />)
  );
};

export default ProtectedRoute