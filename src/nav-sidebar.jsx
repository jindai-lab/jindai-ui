import { NavLink } from "react-router-dom";
import {
  DatabaseOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  ScheduleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloseOutlined
} from "@ant-design/icons";
import { useState } from "react";
import { useEffect } from "react";
import { apiClient } from "./api";

export default function NavSidebar({user, logout}) {
  const [showNavbar, setShowNavbar] = useState(true);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    setShowNavbar(apiClient.localConfig.showNavbar === true);
  }, []);

  return (
    <>
      <aside className={"sidebar " + (showNavbar ? "" : "hide-text")}>
        <div
          className="sidebar-header"
          onClick={() => {
            apiClient.localConfig.showNavbar = !showNavbar;
            setShowNavbar(!showNavbar);
          }}
        >
          <img src="/favicon.ico" width={32} height={32} />
          <span className="menu-text">文献利用平台</span>
        </div>
        <nav className="sidebar-menu">
          <NavLink to="/">
            <FileSearchOutlined />
            <span className="menu-text">搜索</span>
          </NavLink>
          <NavLink to="/histories">
            <HistoryOutlined />
            <span className="menu-text">历史记录</span>
          </NavLink>
          <NavLink to="/settings">
            <SettingOutlined />
            <span className="menu-text">设置</span>
          </NavLink>
          <NavLink to="/files">
            <FolderOpenOutlined />
            <span className="menu-text">文件</span>
          </NavLink>
          <NavLink to="/datasets">
            <DatabaseOutlined />
            <span className="menu-text">数据集</span>
          </NavLink>
          <NavLink to="/tasks">
            <ScheduleOutlined />
            <span className="menu-text">任务</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div
            className="menu-item"
            onClick={() => logout()}
          >
            <LogoutOutlined />
            <span className="menu-text">注销 {user?.profile.preferred_username}</span>
          </div>
          <div
            className="menu-item about-btn"
            onClick={() => setShowAbout(true)}
          >
            <InfoCircleOutlined />
            <span className="menu-text">关于</span>
          </div>
        </div>
      </aside>

      {/* 新增：关于信息弹窗 */}
      {showAbout && (
        <div className="about-modal-mask" onClick={() => setShowAbout(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-modal-header">
              <span>关于</span>
              <CloseOutlined
                className="close-btn"
                onClick={() => setShowAbout(false)}
              />
            </div>
            <div className="about-modal-content">
              <p>文献利用平台 v2.0.5</p>
              <p>检索/管理文献资源工具</p>
              <p>© 2018-{new Date().getFullYear()} Jindai-Lab</p>
              <p>本软件已取得软件著作权登记。</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
