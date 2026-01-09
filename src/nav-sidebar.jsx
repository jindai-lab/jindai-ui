import { NavLink } from 'react-router-dom';
import { DatabaseOutlined, FileSearchOutlined, FolderOpenOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';

export default function NavSidebar() {
  return (
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>文献利用平台</h2>
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
            <span className="menu-text">数据库</span></NavLink>
        </nav>
      </aside>
  )}