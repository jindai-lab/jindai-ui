import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";

const ProtectedRoute = ({auth}) => {
  if (auth.isLoading) {
    console.log('正在验证登录状态')
    return ('');
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