import { useAuth } from "react-oidc-context";
import { Navigate, Outlet } from "react-router-dom";
import { useApiClient } from "../api"; // 之前创建的 Axios Hook

const ProtectedRoute = () => {
  const auth = useAuth();
  // 在此处调用拦截器 Hook，确保子页面发请求时 Token 已挂载
  useApiClient(); 

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