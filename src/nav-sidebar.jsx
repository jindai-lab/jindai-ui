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
import { version } from "../package.json";
import { useTranslation } from "react-i18next";

export default function NavSidebar({user, logout}) {
  const { t } = useTranslation();
  const [showNavbar, setShowNavbar] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [backendVersion, setBackendVersion] = useState('000');

  useEffect(() => {
    setShowNavbar(apiClient.localConfig.showNavbar === true);
    apiClient.get('openapi.json').then(resp => setBackendVersion(resp.data.info.version.split('.').pop()))
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
          <span className="menu-text">{t("platform_name")}</span>
        </div>
        <nav className="sidebar-menu">
          <NavLink to="/">
            <FileSearchOutlined />
            <span className="menu-text">{t("search")}</span>
          </NavLink>
          <NavLink to="/histories">
            <HistoryOutlined />
            <span className="menu-text">{t("history")}</span>
          </NavLink>
          <NavLink to="/settings">
            <SettingOutlined />
            <span className="menu-text">{t("settings")}</span>
          </NavLink>
          <NavLink to="/files">
            <FolderOpenOutlined />
            <span className="menu-text">{t("files")}</span>
          </NavLink>
          <NavLink to="/datasets">
            <DatabaseOutlined />
            <span className="menu-text">{t("datasets")}</span>
          </NavLink>
          <NavLink to="/tasks">
            <ScheduleOutlined />
            <span className="menu-text">{t("tasks")}</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div
            className="menu-item"
            onClick={() => logout()}
          >
            <LogoutOutlined />
            <span className="menu-text">{t("logout")} {user?.profile.preferred_username}</span>
          </div>
          <div
            className="menu-item about-btn"
            onClick={() => setShowAbout(true)}
          >
            <InfoCircleOutlined />
            <span className="menu-text">{t("about")}</span>
          </div>
        </div>
      </aside>

      {/* About modal */}
      {showAbout && (
        <div className="about-modal-mask" onClick={() => setShowAbout(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-modal-header">
              <span>{t("about")}</span>
              <CloseOutlined
                className="close-btn"
                onClick={() => setShowAbout(false)}
              />
            </div>
            <div className="about-modal-content">
              <p>{t("platform_version", { frontend: version, backend: backendVersion })}</p>
              <p>{t("literature_resource_tool")}</p>
              <p>{t("copyright", { year: new Date().getFullYear() })}</p>
              <p>{t("software_registered")}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
