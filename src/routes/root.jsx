import { Outlet } from "react-router-dom";
import NavSidebar from "../nav-sidebar";
export default function Root() {
  return (
    <div className="app-container">
      <NavSidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
