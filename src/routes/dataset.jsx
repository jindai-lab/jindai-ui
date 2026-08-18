import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  MergeCellsOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import {
  Button, Form, Input, Modal, Popconfirm, Space, Table, Drawer, List, Empty, message
} from 'antd';
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api'
import { useTranslation } from "react-i18next";
import FileSourceSelector from '../components/filesource-selector';

export default function DatasetPage() {
const { t } = useTranslation();

  const [datasets, setDatasets] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [creatingDataset, setCreatingDataset] = useState(false);
  const [creatingDatasetName, setCreatingDatasetName] = useState('');
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeForm] = Form.useForm();
  const [mergeLoading, setMergeLoading] = useState(false);
  const navigate = useNavigate();

  // Dataset detail (file paths) state
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailPaths, setDetailPaths] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addPaths, setAddPaths] = useState([]);
  const [addLoading, setAddLoading] = useState(false);
  const [removingPath, setRemovingPath] = useState(null);

  const columns = [
    {
      title: t("name"),
      dataIndex: 'title',
      key: 'title',
      width: '40%',
    },
    {
      title: t("sort_weight"),
      dataIndex: 'order_weight',
      key: 'order_weight',
      width: '20%',
    },
    {
      title: t("action"),
      key: 'action',
      width: '28%',
      align: 'center',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button style={{color: 'var(--primary)'}} icon={<FolderOpenOutlined />} size="small" onClick={() => handleDetail(record)} type="link">文件</Button>
          <Button style={{color: 'var(--primary)'}} icon={<PlusOutlined />} size="small" onClick={() => handleAdd(record.value + '--')} type="link">添加</Button>
          <Button style={{color: 'var(--primary)'}} icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} type="link">编辑</Button>
          <Button style={{color: 'var(--primary)'}} icon={<ImportOutlined />} size="small" onClick={() => navigate(`/import?dataset=${record.value}`)} type="link">导入</Button>
          <Popconfirm
            title={`确定删除【${record.value}】吗？`}
            onConfirm={() => handleDelete(record)}
            okText={t("confirm")}
            cancelText={t("cancel")}
          >
            <Button icon={<DeleteOutlined />} size="small" danger type="link">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleRefresh = () => {
    message.loading(t("refresh_dataset_list"), 0);
    apiClient.datasets()
      .then(setDatasets)
      .finally(() => { message.destroy() });
  }

  useEffect(() => {
    handleRefresh()
  }, []);

  // 表格通用配置
  const tableProps = {
    columns,
    dataSource: datasets,
    rowKey: 'value',
    bordered: false,
    pagination: true,
    size: 'middle',
    scroll: { x: 'max-content' },
    style: { marginTop: 16, borderRadius: 8, overflow: 'hidden' },
    rowClassName: 'file-row-dir',
    onRow: (record) => ({
      onClick: () => handleDetail(record),
      style: { cursor: 'pointer' },
    }),
  };

  const handleDetail = (record) => {
    setDetailRecord(record);
    setDetailPaths([]);
    setAddPaths([]);
    setAddLoading(false);
    loadDatasetFiles(record.record_id);
  };

  const loadDatasetFiles = async (datasetId) => {
    if (!datasetId) {
      setDetailPaths([]);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await apiClient.datasetFiles(datasetId);
      setDetailPaths(res?.paths || []);
    } catch (err) {
      message.error(err.message || '获取文件列表失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddFiles = async () => {
    if (!addPaths?.length) {
      message.warning('请先选择要添加的文件路径');
      return;
    }
    setAddLoading(true);
    try {
      const res = await apiClient.datasetAddFiles(detailRecord.record_id, addPaths);
      message.success('文件路径添加成功');
      setDetailPaths(res?.paths || []);
      setAddPaths([]);
    } catch (err) {
      message.error(err.message || '添加文件路径失败');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveFile = async (path) => {
    setRemovingPath(path);
    try {
      const res = await apiClient.datasetRemoveFiles(detailRecord.record_id, [path]);
      message.success('文件路径已移除');
      setDetailPaths(res?.paths || []);
    } catch (err) {
      message.error(err.message || '移除文件路径失败');
    } finally {
      setRemovingPath(null);
    }
  };

  const handleAdd = (newName) => {
    setCreatingDataset(true)
    setCreatingDatasetName(newName)
  }

  const handleEdit = (record) => {
    setEditingRecord(record);
    setNewName(record.value);
  }

  const handleDelete = (record) => {
    apiClient.delete(`datasets/${record.record_id}`).then((e) => {
      console.log(e)
      message.info(t("delete_success"))
      handleRefresh()
    })
  }

  const handleMerge = async (values) => {
    setMergeLoading(true);
    try {
      const result = await apiClient.datasetMerge({
        pattern: values.pattern || undefined,
        regex: values.regex || undefined,
        target: values.target
      });
      message.success(result.message);
      setMergeModalOpen(false);
      mergeForm.resetFields();
      handleRefresh();
    } catch (err) {
      message.error(err.message || t("merge_failed"));
    } finally {
      setMergeLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size="small">
          <Button icon={<ReloadOutlined />} size="small" onClick={handleRefresh}>刷新</Button>
          <Button icon={<MergeCellsOutlined />} size="small" onClick={() => setMergeModalOpen(true)}>合并数据集</Button>
        </Space>
        数据集
      </div>
      <Table {...tableProps} />

      {/* Dataset detail drawer: manage file paths */}
      <Drawer
        title={`${t("dataset")}: ${detailRecord?.value || ''}`}
        width={560}
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>{t("add_file_path")}</div>
          <Space style={{ width: '100%' }} direction="vertical">
            <FileSourceSelector
              multiple
              value={addPaths}
              onChange={setAddPaths}
              placeholder={t("select_file_source")}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={addLoading}
              onClick={handleAddFiles}
              disabled={!addPaths?.length}
            >
              {t("add")}
            </Button>
          </Space>
        </div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          {t("associated_files")}（{detailPaths.length}）
        </div>
        <List
          loading={detailLoading}
          bordered
          dataSource={detailPaths}
          locale={{ emptyText: <Empty description={t("no_files")} /> }}
          renderItem={(path) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="remove"
                  title={`确定从该数据集移除【${path}】吗？`}
                  onConfirm={() => handleRemoveFile(path)}
                  okText={t("confirm")}
                  cancelText={t("cancel")}
                >
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    type="link"
                    size="small"
                    loading={removingPath === path}
                  >
                    {t("remove")}
                  </Button>
                </Popconfirm>,
              ]}
            >
              {path}
            </List.Item>
          )}
        />
      </Drawer>

      <Modal
        title={t("rename") + (editingRecord?.title || '')}
        okText={t("edit")}
        cancelText={t("cancel")}
        open={!!editingRecord}
        onOk={async () => {
          try {
            await apiClient.datasetRename({
              id: editingRecord.record_id,
              original: editingRecord.title,
              newName: newName.trim()
            })
            message.success(`t("dataset_renamed_successfully")`);
            handleRefresh(); // 刷新目录列表，实时展示新名称
            setEditingRecord(null);
            setNewName('');
          } catch (err) {
            message.error(t("rename_failed") + err.message || t("server_exception"));
          }
        }}
        onCancel={() => setEditingRecord(null)}
      >
        <Input placeholder={t("please_enter_new_name")} value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Modal>
      <Modal
        title="新建数据集"
        okText={t("create")}
        cancelText={t("cancel")}
        open={creatingDataset}
        onOk={async () => {
          if (!creatingDatasetName.trim()) {
            message.warning(t("please_enter_new_name"));
            return;
          }
          try {
            const result = await apiClient.datasetCreate({
              name: creatingDatasetName.trim()
            });
            if (result === undefined) {
              // makeCall 内部已弹出错误提示，但这里保证不误报成功
              return;
            }
            message.success(t("dataset_created_successfully"));
            handleRefresh(); // 刷新目录列表，实时展示新增结果
            setCreatingDataset(false);
            setCreatingDatasetName('');
          } catch (err) {
            message.error(t("create_failed") + err.message || t("server_exception"));
          }
        }}
        onCancel={() => setCreatingDataset(false)}
      >
        <Input placeholder={t("please_enter_new_name")} value={creatingDatasetName} onChange={(e) => setCreatingDatasetName(e.target.value)} />
      </Modal>
      <Modal
        title="合并数据集"
        okText={t("merge")}
        cancelText={t("cancel")}
        open={mergeModalOpen}
        confirmLoading={mergeLoading}
        onOk={() => mergeForm.submit()}
        onCancel={() => {
          setMergeModalOpen(false);
          mergeForm.resetFields();
        }}
      >
        <Form
          form={mergeForm}
          layout="vertical"
          onFinish={handleMerge}
        >
          <Form.Item
            name="pattern"
            label="包含字符串"
            tooltip="匹配包含此字符串的数据集名称（不区分大小写）"
          >
            <Input placeholder="例如: 2024" />
          </Form.Item>
          <Form.Item
            name="regex"
            label="正则表达式"
            tooltip="使用正则表达式匹配数据集名称"
          >
            <Input placeholder="例如: ^report_.*" />
          </Form.Item>
          <Form.Item
            name="target"
            label="目标数据集"
            rules={[{ required: true, message: '请输入目标数据集名称' }]}
          >
            <Input placeholder="合并后的数据集名称" />
          </Form.Item>
          <Form.Item>
            <div style={{ color: '#888', fontSize: '12px' }}>
              注意：匹配的数据集将被合并到目标数据集中，源数据集会被删除。此操作不可撤销。
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}