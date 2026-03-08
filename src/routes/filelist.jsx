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
  DownloadOutlined,
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
import { apiClient } from "../api";
import OcrLanguageSelectModal from "../components/ocr-selector";
import { useTranslation } from "react-i18next";

const FileManager = ({ folderPath }) => {
const { t } = useTranslation();
  // 状态管理：当前目录ID、当前目录列表、面包屑导航、搜索关键词
  const [currentFileList, setCurrentFileList] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [newName, setNewName] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [creatingDir, setCreatingDir] = useState(false);
  const [folderName, setFolderName] = useState("");
  const navigate = useNavigate();

  async function listFiles(folderPath) {
    return await apiClient.listFiles(folderPath);
  }

  // 初始化 + 切换目录时，筛选当前目录下的文件/文件夹
  useEffect(() => {
    async function updateFolderInfo() {
      const data = await listFiles(folderPath);
      let list = data;
      // 排序规则：文件夹优先展示，名称正序排列
      setCurrentFileList(list);
    }
    updateFolderInfo();
  }, [folderPath]);

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
    console.log(t("delete_file_folder"), record.relative_path);
    apiClient
      .deleteFile(record.relative_path)
      .then((response) => {
        message.success(`${record.is_directory ? t("folder") : t("file")}删除成功`);
        handleRefresh(); // 刷新目录列表，实时更新删除结果
      })
      .catch((err) => {
        message.error(t("delete_failed") + err.message || t("server_exception"));
      });
  };

  const submitOcr = (record, ocrModalResult) => {
    apiClient.workerSubmitTask("ocr", {
      input_path: record.relative_path,
      output_path:
        record.relative_path.split("/").slice(0, -1).join("/") + "/" + ocrModalResult.newName,
      lang: ocrModalResult.tesseractCode,
      monochrome: ocrModalResult.monochrome
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
    navigate(`/files/${parentPath}`);
  };

  /** 刷新当前目录 */
  const handleRefresh = () => {
    listFiles(folderPath).then((data) => {
      setCurrentFileList(data);
    });
    message.success(t("directory_refreshed"));
  };

  // ========== 表格列配置 ==========
  const columns = [
    {
      title: t("name"),
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
      title: t("size"),
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
      title: t("create_time"),
      dataIndex: "created_at",
      key: "created_at",
      width: "25%",
      align: "left",
      render: (text) => new Date(text).toLocaleString("zh-CN"),
    },
    {
      title: t("action"),
      key: "action",
      width: "20%",
      align: "left",
      render: (_, record) => (
        <Space size="small">
          {!record.is_directory && (<Button
            onClick={() =>
              apiClient
                .download(`files/${encodeURIComponent(record.relative_path)}`)
                .then(({ url }) => {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = record.relative_path.split('/').pop()
                  link.click();
                  link.remove();
                })
            }
            size="small"
            icon={<DownloadOutlined />}
            type="link"
            style={{ color: "var(--primary)" }}
          >
            下载
          </Button>
          )}
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
            type="link"
            style={{ color: "var(--primary)" }}
          >
            编辑
          </Button>
          {(record.name.endsWith('.pdf') || record.is_directory) && (
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
            okText={t("confirm")}
            cancelText={t("cancel")}
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
    pagination: true,
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
        title={t("rename") + (editingRecord?.relative_path || "")}
        okText={t("edit")}
        cancelText={t("cancel")}
        open={!!editingRecord}
        onOk={async () => {
          try {
            // 请求后台接口 PUT /api/files/<文件/文件夹id> 修改名称
            await apiClient.fileRename({
              original: editingRecord.relative_path,
              newName: newName.trim(),
            });
            message.success(
              `${editingRecord.is_directory ? t("folder") : t("file")}${t("重命名成功")}`,
            );
            handleRefresh(); // 刷新目录列表，实时展示新名称
            setEditingRecord(null);
            setNewName("");
          } catch (err) {
            message.error(t("rename_failed") + err.message || t("server_exception"));
          }
        }}
        onCancel={() => setEditingRecord(null)}
      >
        <Input
          placeholder={t("please_enter_new_name")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </Modal>
      <Modal
        title="新建文件夹"
        okText={t("create")}
        cancelText={t("cancel")}
        open={creatingDir}
        onOk={async () => {
          try {
            await apiClient.createFolder(folderPath, folderName);
            message.success(t("folder_created_successfully"));
            handleRefresh(); // 刷新目录列表，实时展示新增结果
            setCreatingDir(false);
            setFolderName("");
          } catch (err) {
            message.error(t("create_failed") + err.message || t("server_exception"));
          }
        }}
        onCancel={() => setCreatingDir(false)}
      >
        <Input
          placeholder={t("please_enter_new_name")}
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
          placeholder={t("search_file_folder_name")}
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
            headers={{ Authorization: 'Bearer ' + apiClient.bearer }}
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
