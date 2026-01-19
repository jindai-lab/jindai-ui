import {
  FolderOutlined,
  FileOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  LeftOutlined,
  ReloadOutlined,
  UploadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  message,
  Popconfirm,
  Modal,
  Upload,
} from "antd";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient as api } from "../api";
import OcrLanguageSelectModal from "../components/ocr-selector";

const FileManager = ({ folderPath }) => {
  // 状态管理：当前目录ID、当前目录列表、面包屑导航、搜索关键词
  const [currentFileList, setCurrentFileList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [newName, setNewName] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [creatingDir, setCreatingDir] = useState(false);
  const [folderName, setFolderName] = useState("");
  const navigate = useNavigate();

  async function listFiles(folderPath) {
    const data = await api.callAPI(
      `files${encodeURI(folderPath)}?metadata=true`,
    );
    const list = data.items || [];
    list.sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return a.name.localeCompare(b.name);
    });
    message.destroy();
    return list;
  }

  // 初始化 + 切换目录时，筛选当前目录下的文件/文件夹
  useEffect(() => {
    async function updateFolderInfo() {
      const data = await listFiles(folderPath);
      let list = data;
      // 搜索过滤：名称包含关键词
      if (searchValue) {
        list = list.filter((item) => item.name.includes(searchValue));
      }
      // 排序规则：文件夹优先展示，名称正序排列
      setCurrentFileList(list);
    }
    message.loading("正在加载目录...", 0);
    updateFolderInfo();
  }, [folderPath, searchValue]);

  // ========== 预留空实现 - 增删改查核心方法 ==========
  /** 新增文件/文件夹 */
  const handleAdd = (isDir) => {
    if (isDir) {
      setCreatingDir(true);
    }
  };

  /** 删除文件/文件夹 */
  const handleDelete = (record) => {
    // 请求后台接口 DELETE /api/files/<文件/文件夹id> 删除资源
    console.log("删除文件/文件夹：", record.relative_path);
    api
      .callAPI(`files/${record.relative_path}`, null, { method: "DELETE" })
      .then((response) => {
        message.success(`${record.is_directory ? "文件夹" : "文件"}删除成功`);
        handleRefresh(); // 刷新目录列表，实时更新删除结果
      })
      .catch((err) => {
        message.error("删除失败：" + err.message || "服务器异常");
      });
  };

  const submitOcr = (record, ocrModalResult) => {
    api.callAPI("worker", {
      task_type: "ocr",
      params: {
        input: record.relative_path,
        output:
          record.relative_path.split("/").slice(0, -1).join("/") + "/" + ocrModalResult.newName,
        lang: ocrModalResult.tesseractCode,
      },
    });
  };

  /** 编辑文件/文件夹名称 */
  const handleEdit = (record) => {
    setNewName(record.name);
    setEditingRecord(record);
  };

  /** 查看/打开文件/文件夹 */
  const handleView = (record) => {
    if (record.is_directory) {
      // 是文件夹：进入子目录
      navigate(`/files/${record.relative_path}/`);
    } else {
      navigate(`/files/${record.relative_path}`);
    }
  };

  /** 返回上级目录 */
  const handleGoBack = () => {
    if (folderPath === "" || folderPath === "/") return;
    const parentPath = folderPath.split("/").slice(0, -2).join("/") + "/";
    navigate(`/files${parentPath === "/" ? "" : parentPath}`);
  };

  /** 刷新当前目录 */
  const handleRefresh = () => {
    console.log("触发刷新目录操作");
    listFiles(folderPath).then((data) => {
      setCurrentFileList(data);
    });
    message.success("目录已刷新");
  };

  // ========== 表格列配置 ==========
  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: "40%",
      render: (text, record) => (
        <div
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={() => handleView(record)}
        >
          {record.is_directory ? (
            <FolderOutlined
              className="mr-2"
              style={{ color: "var(--primary)" }}
            />
          ) : (
            <FileOutlined className="mr-2" style={{ color: "#666" }} />
          )}
          <span style={{ marginLeft: 5, marginRight: 5 }}>{text}</span>
          {record.is_directory && (
            <Tag color="var(--primary)" size="small" className="ml-2">
              文件夹
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: "15%",
      align: "right",
      render: (text, record) => {
        if (record.is_directory) return "--";
        const units = ["B", "KB", "MB", "GB", "TB"];
        while (text >= 1024) {
          text /= 1024;
          units.shift();
        }
        return `${text.toFixed(2)} ${units[0]}`;
      },
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: "25%",
      align: "center",
      render: (text) => new Date(text).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      width: "20%",
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
            type="link"
            style={{ color: "var(--primary)" }}
          >
            编辑
          </Button>
          { record.name.endsWith('.pdf') && (
          <OcrLanguageSelectModal
            icon={<FileTextOutlined />}
            size="small"
            type="link"
            style={{ color: "var(--primary)" }}
            filename={record.name}
            submit={(lang) => submitOcr(record, lang)}
          />
          )}
          <Popconfirm
            title={`确定删除【${record.name}】吗？`}
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} size="small" danger type="link">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 表格通用配置
  const tableProps = {
    columns,
    dataSource: currentFileList,
    rowKey: "path",
    bordered: false,
    pagination: false,
    size: "middle",
    scroll: { x: "max-content" },
    style: { marginTop: 16, borderRadius: 8, overflow: "hidden" },
    rowClassName: (record) =>
      record.is_directory ? "file-row-dir" : "file-row-file",
  };

  return (
    <>
      {/* 顶部导航区：返回 + 刷新 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Space size="small">
          <Button
            icon={<LeftOutlined />}
            size="small"
            onClick={handleGoBack}
            disabled={folderPath === "" || folderPath === "/"}
          >
            返回
          </Button>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Space>
        {folderPath || "/"}
      </div>
      <Modal
        title={"重命名 /" + (editingRecord?.relative_path || "")}
        okText="修改"
        cancelText="取消"
        open={!!editingRecord}
        onOk={async () => {
          try {
            // 请求后台接口 PUT /api/files/<文件/文件夹id> 修改名称
            await api.fileRename({
              original: editingRecord.relative_path,
              newName: newName.trim(),
            });
            message.success(
              `${editingRecord.is_directory ? "文件夹" : "文件"}重命名成功`,
            );
            handleRefresh(); // 刷新目录列表，实时展示新名称
            setEditingRecord(null);
            setNewName("");
          } catch (err) {
            message.error("重命名失败：" + err.message || "服务器异常");
          }
        }}
        onCancel={() => setEditingRecord(null)}
      >
        <Input
          placeholder="请输入新名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </Modal>
      <Modal
        title="新建文件夹"
        okText="创建"
        cancelText="取消"
        open={creatingDir}
        onOk={async () => {
          try {
            // 请求后台接口 POST /api/files/<当前目录path> 新建文件夹
            await api.callAPI(`files${folderPath}`, {
              name: folderName.trim(),
              is_directory: true,
            });
            message.success("文件夹创建成功");
            handleRefresh(); // 刷新目录列表，实时展示新增结果
            setCreatingDir(false);
            setFolderName("");
          } catch (err) {
            message.error("创建失败：" + err.message || "服务器异常");
          }
        }}
        onCancel={() => setCreatingDir(false)}
      >
        <Input
          placeholder="请输入新名称"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />
      </Modal>
      {/* 功能操作区：搜索 + 新增按钮组 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Input
          placeholder="搜索文件/文件夹名称"
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ width: 300 }}
        />
        <Space size="small">
          <Button
            icon={<PlusOutlined />}
            size="middle"
            onClick={() => handleAdd(true)}
            color="primary"
          >
            新建文件夹
          </Button>
          <Upload
            name="file"
            action={`/api/files${folderPath}`}
            headers={{Authorization: 'Bearer '+ api.bearer}}
            onChange={(info) => {
              if (info.file.status === "done") {
                message.success(`${info.file.name} 上传成功`);
                handleRefresh(); // 刷新目录列表，实时展示上传结果
              } else if (info.file.status === "error") {
                message.error(`${info.file.name} 上传失败`);
              }
            }}
          >
            <Button
              icon={<UploadOutlined />}
              size="middle"
              onClick={() => handleAdd(false)}
            >
              上传文件
            </Button>
          </Upload>
        </Space>
      </div>

      {/* 文件列表核心展示区 */}
      <Table {...tableProps} />
    </>
  );
};

export default function FileListPage({ folderPath }) {
  folderPath = "/" + folderPath.replace(/^\//, "");
  if (folderPath == "/") folderPath = "";
  document.title = `文件列表 - ${folderPath || "/"}`;

  return <FileManager folderPath={folderPath} />;
}
