import { NavLink } from 'react-router-dom';
import { DatabaseOutlined, FileSearchOutlined, FolderOpenOutlined, HistoryOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useEffect } from 'react';

export default function NavSidebar() {
  const [showNavbar, setShowNavbar] = useState(true)

  useEffect(() => {
    if (['true', 'false'].indexOf(localStorage.showNavbar) >= 0) setShowNavbar(localStorage.showNavbar == 'true');
  }, [])

  return (
    <aside className={"sidebar " + (showNavbar ? "" : "hide-text")}>
      <div className="sidebar-header" onClick={() => {
        localStorage.showNavbar = !showNavbar
        setShowNavbar(!showNavbar)
      }}>
        <img src="/favicon.ico" width={32} height={32} /><span className='menu-text'>文献利用平台</span>
      </div>
      <nav className="sidebar-menu">
        <NavLink to="/">
          <FileSearchOutlined />
          <span className="menu-text">搜索</span>
        </NavLink>
        <NavLink to="/histories"><HistoryOutlined />
          <span className="menu-text">历史记录</span>
        </NavLink>
        <NavLink to="/settings"><SettingOutlined />
          <span className="menu-text">设置</span>
        </NavLink>
        <NavLink to="/files"><FolderOpenOutlined />
          <span className="menu-text">文件</span>
        </NavLink>
        <NavLink to="/datasets"><DatabaseOutlined />
          <span className="menu-text">数据集</span>
        </NavLink>
        <NavLink to="/tasks"><ScheduleOutlined />
          <span className="menu-text">任务</span>
        </NavLink>
      </nav>
    </aside>
  )
}