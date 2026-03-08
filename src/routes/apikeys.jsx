import { Card, Button, Table, Modal, Form, Input, message, Space, Tag, Popconfirm } from "antd";
import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

export default function ApiKeysPage() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();
  const [viewingKey, setViewingKey] = useState(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const data = await apiClient.makeCall("apikeys", null, { method: "GET" });
      setApiKeys(data?.data || []);
    } catch (e) {
      message.error(t("加载API密钥失败") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      const data = await apiClient.makeCall("apikeys", values, { method: "POST" });
      message.success(t("API密钥创建成功"));
      // Show the plain key to user (only shown once!)
      Modal.info({
        title: t("API密钥已创建"),
        content: (
          <div>
            <p style={{ color: "var(--primary)", fontWeight: "bold" }}>
              {t("请复制以下API密钥，关闭后将无法再次查看：")}
            </p>
            <div style={{ 
              background: "var(--panel-bg)", 
              padding: "12px", 
              borderRadius: "4px",
              fontFamily: "monospace",
              wordBreak: "break-all"
            }}>
              {data.plain_key}
            </div>
          </div>
        ),
        onOk() {
          loadApiKeys();
          setShowModal(false);
        }
      });
    } catch (e) {
      message.error(t("创建API密钥失败") + ": " + e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.makeCall(`apikeys/${id}`, null, { method: "DELETE" });
      message.success(t("API密钥已删除"));
      loadApiKeys();
    } catch (e) {
      message.error(t("删除API密钥失败") + ": " + e);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await apiClient.makeCall(`apikeys/${id}/revoke`, null, { method: "POST" });
      message.success(t("API密钥已吊销"));
      loadApiKeys();
    } catch (e) {
      message.error(t("吊销API密钥失败") + ": " + e);
    }
  };

  const handleActivate = async (id) => {
    try {
      await apiClient.makeCall(`apikeys/${id}/activate`, null, { method: "POST" });
      message.success(t("API密钥已激活"));
      loadApiKeys();
    } catch (e) {
      message.error(t("激活API密钥失败") + ": " + e);
    }
  };

  const defaultDateFormat = 'YYYY-MM-DD HH:mm:ss'

  const columns = [
    {
      title: t("name"),
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: t("状态"),
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      render: (active) => (
        <Tag color={active ? "green" : "red"}>
          {active ? t("启用") : t("已禁用")}
        </Tag>
      ),
    },
    {
      title: t("create_time"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render (dt) { return dt ? dayjs(dt).format(defaultDateFormat) : ''; }
    },
    {
      title: t("最后使用"),
      dataIndex: "last_used_at",
      key: "last_used_at",
      width: 180,
      render (dt) { return dt ? dayjs(dt).format(defaultDateFormat) : ''; }
    },
    {
      title: t("过期时间"),
      dataIndex: "expires_at",
      key: "expires_at",
      width: 180,
      render (dt) { return dt ? dayjs(dt).format(defaultDateFormat) : ''; }
    },
    {
      title: t("action"),
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.is_active ? (
            <Popconfirm
              title={t("确定要停用此API密钥吗？")}
              onConfirm={() => handleRevoke(record.id)}
              okText={t("confirm")}
              cancelText={t("cancel")}
            >
              <Button size="small">
                {t("停用")}
              </Button>
            </Popconfirm>
          ) : (
            <Button size="small" type="primary" onClick={() => handleActivate(record.id)}>
              {t("激活")}
            </Button>
          )}
            <Popconfirm
              title={t("确定要删除此API密钥吗？")}
              onConfirm={() => handleDelete(record.id)}
              okText={t("confirm")}
              cancelText={t("cancel")}
            >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t("删除")}
            </Button>
            </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            {t("API 密钥管理")}
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowModal(true)}
            >
              {t("创建新密钥")}
            </Button>
          </Space>
        }
        style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}
      >
        <Table
          columns={columns}
          dataSource={apiKeys}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create API Key Modal */}
      <Modal
        title={t("创建 API 密钥")}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label={t("name")}
            rules={[{ required: true, message: t("请输入密钥名称") }]}
          >
            <Input placeholder={t("例如：生产环境密钥")} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t("create")}
              </Button>
              <Button onClick={() => setShowModal(false)}>
                {t("cancel")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
