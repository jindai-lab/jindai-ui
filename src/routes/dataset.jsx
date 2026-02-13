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

export default function DatasetPage() {

  const [datasets, setDatasets] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [creatingDataset, setCreatingDataset] = useState(false);
  const [creatingDatasetName, setCreatingDatasetName] = useState('');
  const navigate = useNavigate();

  const columns = [
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      width: '40%',
    },
    {
      title: '排序权重',
      dataIndex: 'order_weight',
      key: 'order_weight',
      width: '20%',
    },
    {
      title: '操作',
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
            okText="确定"
            cancelText="取消"
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
    pagination: false,
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
      message.info('删除成功')
      handleRefresh()
    })
  }

  const handleRefresh = () => {
    message.loading('刷新数据集列表', 0);
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
        title={"重命名 " + (editingRecord?.title || '')}
        okText="修改"
        cancelText="取消"
        open={!!editingRecord}
        onOk={async () => {
          try {
            await apiClient.datasetRename({
              id: editingRecord.record_id,
              original: editingRecord.title,
              newName: newName.trim()
            })
            message.success(`数据集重命名成功`);
            handleRefresh(); // 刷新目录列表，实时展示新名称
            setEditingRecord(null);
            setNewName('');
          } catch (err) {
            message.error('重命名失败：' + err.message || '服务器异常');
          }
        }}
        onCancel={() => setEditingRecord(null)}
      >
        <Input placeholder="请输入新名称" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Modal>
      <Modal
        title="新建数据集"
        okText="创建"
        cancelText="取消"
        open={creatingDataset}
        onOk={async () => {
          try {
            apiClient.datasetCreate({
              name: creatingDatasetName.trim()
            })
            message.success('文件夹创建成功');
            handleRefresh(); // 刷新目录列表，实时展示新增结果
            setCreatingDataset(false);
            setCreatingDatasetName('');
          } catch (err) {
            message.error('创建失败：' + err.message || '服务器异常');
          }
        }}
        onCancel={() => setCreatingDataset(false)}
      >
        <Input placeholder="请输入新名称" value={creatingDatasetName} onChange={(e) => setCreatingDatasetName(e.target.value)} />
      </Modal>
    </>
  )
}