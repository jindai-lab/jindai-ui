# Jindai UI - 文献利用平台用户界面

提供 [Jindai 文献利用平台](https://github.com/jindai-lab/jindai) 的用户界面。

## 技术栈

- **框架**：React 19.2.0
- **路由**：React Router DOM 7.12.0
- **UI 组件库**：Ant Design 6.1.4
- **网络请求**：Axios 1.13.2
- **构建工具**：Vite 7.2.4（高效打包构建，支持 CSS 压缩优化）
- **状态管理**：原生 React 状态管理方案 + Context API
- **国际化**：i18next + react-i18next
- **身份认证**：oidc-client-ts（OpenID Connect 客户端实现）
- **代码高亮**：PrismJS
- **PDF 渲染**：pdfjs-dist 5.4.296 + react-pdf
- **流程图**：@xyflow/react

## 安装方式（Docker 部署）

### 前置准备

1.  **安装 Docker**：参考 [Docker 官方文档](https://docs.docker.com/get-docker/) 完成安装
2.  **准备配置文件**：确保后端服务 `jindai` 已部署并可访问

### 部署步骤

#### 1. 构建前端镜像（可选）

```bash
cd jindai-ui

# 构建 Nginx 镜像
docker build -t jindai-ui:latest -f Dockerfile.nginx .
```

#### 2. 运行容器

```bash
docker run -d \
  --name jindai-ui \
  -p 80:80 \
  -e API_URL=http://your-backend-host:8370 \
  jindai-ui:latest
```

#### 3. 访问服务

服务启动后，访问 `http://localhost` 即可使用平台界面。

## 开发部署

### 前置要求

- Node.js 18+
- npm / pnpm

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install
```

### 运行开发服务器

```bash
# 使用 npm
npm run dev

# 或使用 pnpm
pnpm dev
```

访问 `http://localhost:5173` 即可查看界面。

### 构建生产版本

```bash
# 使用 npm
npm run build

# 或使用 pnpm
pnpm build
```

构建产物将输出到 `dist` 目录。

### 代码检查

```bash
# 使用 npm
npm run lint

# 或使用 pnpm
pnpm lint
```

## 项目结构

```
jindai-ui/
├── src/
│   ├── api.js              # API 请求封装
│   ├── main.jsx            # 应用入口
│   ├── index.css           # 全局样式
│   ├── i18n/               # 国际化配置
│   │   └── zh-CN.json
│   ├── routes/             # 路由页面
│   │   ├── root.jsx        # 根路由
│   │   ├── protected.jsx   # 保护路由
│   │   ├── dataset.jsx     # 数据集管理
│   │   ├── file.jsx        # 文件管理
│   │   ├── filelist.jsx    # 文件列表
│   │   ├── history.jsx     # 历史记录
│   │   ├── import.jsx      # 文件导入
│   │   ├── search.jsx      # 搜索页面
│   │   ├── settings.jsx    # 设置页面
│   │   ├── task.jsx        # 任务管理
│   │   └── workflow.jsx    # 工作流管理
│   ├── components/         # 可复用组件
│   │   ├── dataset-selector.jsx
│   │   ├── filesource-selector.jsx
│   │   ├── job-widgets.jsx
│   │   ├── jobs-list.jsx
│   │   ├── logs-viewer.jsx
│   │   ├── ocr-selector.jsx
│   │   ├── paragraph-item.jsx
│   │   ├── param-panel.jsx
│   │   ├── remote-filter-selector.jsx
│   │   ├── ws-workerstats.jsx
│   │   └── yaml-editor.jsx
│   └── assets/             # 静态资源
│       └── react.svg
├── public/                 # 公共资源
│   └── favicon.ico
├── index.html              # HTML 模板
├── vite.config.js          # Vite 配置
├── eslint.config.js        # ESLint 配置
└── package.json
```

## 环境变量

开发环境下，可在项目根目录创建 `.env` 文件配置环境变量：

```env
VITE_API_URL=http://localhost:8370
```

## 许可证

本项目采用 [MIT 许可证](../LICENSE)。
