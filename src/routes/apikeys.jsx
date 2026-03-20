import { Card, Button, Table, Modal, Form, Input, message, Space, Tag, Popconfirm } from "antd";
import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ASSET_MCP_JSON from '../assets/mcp.json?raw'
import ASSET_MCP_PY from '../assets/jindai-mcp.py?raw'

export default function ApiKeysPage() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
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
      message.error(t("Failed to load API keys") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      const data = await apiClient.makeCall("apikeys", values, { method: "POST" });
      message.success(t("API key created successfully"));
      // Show the plain key to user (only shown once!)
      Modal.info({
        title: t("API Key Created"),
        content: (
          <div>
            <p style={{ color: "var(--primary)", fontWeight: "bold" }}>
              {t("copy_api_key")}
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
      message.error(t("Failed to create API key") + ": " + e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.makeCall(`apikeys/${id}`, null, { method: "DELETE" });
      message.success(t("API key deleted"));
      loadApiKeys();
    } catch (e) {
      message.error(t("Failed to delete API key") + ": " + e);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await apiClient.makeCall(`apikeys/${id}/revoke`, null, { method: "POST" });
      message.success(t("API key revoked"));
      loadApiKeys();
    } catch (e) {
      message.error(t("Failed to revoke API key") + ": " + e);
    }
  };

  const handleActivate = async (id) => {
    try {
      await apiClient.makeCall(`apikeys/${id}/activate`, null, { method: "POST" });
      message.success(t("API key activated"));
      loadApiKeys();
    } catch (e) {
      message.error(t("Failed to activate API key") + ": " + e);
    }
  };

  const defaultDateFormat = 'YYYY-MM-DD HH:mm:ss'

  const columns = [
    {
      title: t("Name"),
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: t("Status"),
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      render: (active) => (
        <Tag color={active ? "green" : "red"}>
          {active ? t("Active") : t("Disabled")}
        </Tag>
      ),
    },
    {
      title: t("Create Time"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render (dt) { return dt ? dayjs(dt).format(defaultDateFormat) : ''; }
    },
    {
      title: t("Last Used"),
      dataIndex: "last_used_at",
      key: "last_used_at",
      width: 180,
      render (dt) { return dt ? dayjs(dt).format(defaultDateFormat) : ''; }
    },
    {
      title: t("Expires At"),
      dataIndex: "expires_at",
      key: "expires_at",
      width: 180,
      render (dt) { return dt ? dayjs(dt).format(defaultDateFormat) : ''; }
    },
    {
      title: t("Action"),
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.is_active ? (
            <Popconfirm
              title={t("Are you sure you want to deactivate this API key?")}
              onConfirm={() => handleRevoke(record.id)}
              okText={t("Confirm")}
              cancelText={t("Cancel")}
            >
              <Button size="small">
                {t("Deactivate")}
              </Button>
            </Popconfirm>
          ) : (
            <Button size="small" type="primary" onClick={() => handleActivate(record.id)}>
              {t("Activate")}
            </Button>
          )}
            <Popconfirm
              title={t("Are you sure you want to delete this API key?")}
              onConfirm={() => handleDelete(record.id)}
              okText={t("Confirm")}
              cancelText={t("Cancel")}
            >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t("Delete")}
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
            {t("api_key_management")}
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowModal(true)}
            >
              {t("create_new_key")}
            </Button>
            <Button 
              icon={<EyeOutlined />}
              onClick={() => setShowExampleModal(true)}
            >
              {t("example_code")}
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
        title={t("create_api_key")}
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
            label={t("Name")}
            rules={[{ required: true, message: t("Please enter a key name") }]}
          >
            <Input placeholder={t("e_g_production_key")} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t("Create")}
              </Button>
              <Button onClick={() => setShowModal(false)}>
                {t("Cancel")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Example Code Modal */}
      <Modal
        title={t("example_code")}
        open={showExampleModal}
        onCancel={() => setShowExampleModal(false)}
        footer={null}
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0' }}>{t("mcp.json")}</h4>
            <pre style={{ 
              background: "var(--panel-bg)", 
              padding: "12px", 
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "12px",
              maxHeight: "200px",
              overflowY: "auto"
            }}>
              {ASSET_MCP_JSON.replace('<HOST>', location.host)}
            </pre>
            <Button 
              type="primary" 
              style={{ marginTop: '8px' }}
              onClick={() => {
                // Download mcp.json
                const element = document.createElement("a");
                const file = new Blob(["{}"], {type: 'application/json'});
                element.href = URL.createObjectURL(file);
                element.download = "mcp.json";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
            >
              {t("download")}
            </Button>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0' }}>jindai-mcp.py</h4>
            <pre style={{ 
              background: "var(--panel-bg)", 
              padding: "12px", 
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "12px",
              maxHeight: "200px",
              overflowY: "auto"
            }}>
              {ASSET_MCP_PY}
            </pre>
            <Button 
              type="primary" 
              style={{ marginTop: '8px' }}
              onClick={() => {
                // Download mcp.py
                const element = document.createElement("a");
                const file = new Blob([""], {type: 'text/plain'});
                element.href = URL.createObjectURL(file);
                element.download = "jindai-mcp.py";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
            >
              {t("download")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
