import {
  DeleteOutlined,
  EditOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Button, Input, message, Modal, Popconfirm, Space, Table } from 'antd';
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api'
import { useTranslation } from "react-i18next";

export default function DatasetPage() {
const { t } = useTranslation();

  const [datasets, setDatasets] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [creatingDataset, setCreatingDataset] = useState(false);
  const [creatingDatasetName, setCreatingDatasetName] = useState('');
  const navigate = useNavigate();

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
      width: '20%',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
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
    rowClassName: (record) => record.is_directory ? 'file-row-dir' : 'file-row-file',
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

  const handleRefresh = () => {
    message.loading(t("refresh_dataset_list"), 0);
    apiClient.datasets()
      .then(setDatasets)
      .finally(() => { message.destroy() });
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size="small">
          <Button icon={<ReloadOutlined />} size="small" onClick={handleRefresh}>刷新</Button>
        </Space>
        数据集
      </div>
      <Table {...tableProps} />

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
          try {
            apiClient.datasetCreate({
              name: creatingDatasetName.trim()
            })
            message.success(t("folder_created_successfully"));
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
    </>
  )
}