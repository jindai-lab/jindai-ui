import { useState, useEffect, useRef } from "react";
import { Collapse, Popconfirm, Button, Table, Tag, Modal, Descriptions, Divider, Typography, Space, Tooltip } from "antd";
import { DeleteOutlined, PauseOutlined, CaretRightOutlined, ClearOutlined, CloudDownloadOutlined } from "@ant-design/icons";
import { JobStatusTag } from "./job-widgets";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

export function JobsList({ jobs }) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);

  const removeJob = async (jobId) => {
    await apiClient.workerJobDelete(jobId);
  };

  const handleJobClick = (job) => {
    setCurrentJob(job);
    setModalVisible(true);
  };

  const jobColumns = [
    {
      title: "ID",
      key: "task_id",
      render: (record) => (
        <span
          onClick={() => handleJobClick(record)}
          style={{ color: "#1890ff", cursor: "pointer" }}
        >
          <Tag>{record.task_name}</Tag>
          {record.task_id}
        </span>
      ),
    },
    {
      title: t("enqueue_time"),
      key: "created_at",
      dataIndex: "created_at",
      render: (dt) => apiClient.formatIsoToDateTime(dt),
    },
    {
      title: t("completion_status"),
      dataIndex: "status",
      key: "status",
      render: (status) => <JobStatusTag status={status} />,
    },
    {
      title: t("action"),
      key: "operation",
      render: (record) => {
        return (
          <>
            <Popconfirm
              title={`确定删除【${record.task_id}】吗？`}
              onConfirm={() => removeJob(record.task_id)}
              okText={t("confirm")}
              cancelText={t("cancel")}
            >
              <Button size="small" icon={<DeleteOutlined />} danger>
                删除
              </Button>
            </Popconfirm>
          </>
        );
      },
    },
  ];

  return (
    <Collapse defaultActiveKey={[]}>
      <Collapse.Panel header={t("result_details")} key="detailed">
        <Table
          columns={jobColumns}
          dataSource={jobs}
          pagination={false}
          size="middle"
          bordered
        />
        <JobDetailModal
          key={currentJob ? currentJob.task_id : "none"}
          job={currentJob}
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
        />
      </Collapse.Panel>
    </Collapse>
  );
}

function getWebSocketBaseUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/v2/worker/logs`;
}

function JobDetailModal({ job, visible, onCancel }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected, connecting, connected
  const [isPaused, setIsPaused] = useState(false);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);
  const logsRef = useRef([]);
  const isPausedRef = useRef(false);
  const jobRef = useRef(job);

  // 保持最新值供 WebSocket 回调使用
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  // 自动滚动到底部
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // 打开 Modal 时建立 WebSocket 连接
  useEffect(() => {
    if (!visible || !job) return;

    const socketUrl = `${getWebSocketBaseUrl()}?token=${apiClient.bearer}`;
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      ws.send(JSON.stringify({ action: "subscribe", task_id: jobRef.current.task_id }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "log" && msg.data) {
          // 仅显示当前任务的日志
          if (msg.task_id && msg.task_id !== jobRef.current.task_id) return;
          const formatted = {
            timestamp: msg.data.timestamp,
            level: msg.data.level || "INFO",
            message: msg.data.message,
          };
          logsRef.current = [...logsRef.current, formatted];
          if (!isPausedRef.current) {
            setLogs(logsRef.current);
          }
        } else if (msg.type === "ping") {
          // keepalive
        }
      } catch (error) {
        console.error("解析日志消息失败:", error);
      }
    };

    ws.onerror = () => {
      setWsStatus("disconnected");
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [visible, job]);

  if (!job) {
    return null;
  }

  const handlePauseToggle = () => {
    setIsPaused((prev) => {
      const next = !prev;
      if (!next) {
        // 恢复时一次性显示累积的日志
        setLogs(logsRef.current);
      }
      return next;
    });
  };

  const handleClearLogs = () => {
    setLogs([]);
    logsRef.current = [];
  };

  const handleDownloadLogs = () => {
    const content = logs
      .map((log) => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-${job.task_id}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderWsStatus = () => {
    if (wsStatus === "connected") {
      return <Tag color="success">LIVE</Tag>;
    }
    if (wsStatus === "connecting") {
      return <Tag color="processing">连接中...</Tag>;
    }
    return <Tag color="default">未连接</Tag>;
  };

  const levelColor = (level) => {
    const lv = (level || "").toUpperCase();
    if (lv.includes("ERROR")) return "#ff4d4f";
    if (lv.includes("WARN")) return "#faad14";
    if (lv.includes("DEBUG")) return "#1890ff";
    return "#52c41a";
  };

  return (
    <Modal
      title={`详情 - ${job.task_id}`}
      open={visible}
      onCancel={onCancel}
      width={900}
      maskClosable={false}
      footer={null}
    >
      <div style={{ padding: "10px 0" }}>
        <h3>基本信息</h3>
        <Descriptions
          column={2}
          bordered
          size="middle"
          labelStyle={{ fontWeight: "bold" }}
        >
          <Descriptions.Item label={t("execution_status")}>
            <JobStatusTag status={job.status} />
          </Descriptions.Item>
          <Descriptions.Item label={t("task_name")}>
            {job.task_name || <Text type="secondary">无</Text>}
          </Descriptions.Item>
          <Descriptions.Item label={t("enqueue_time")}>
            {apiClient.formatIsoToDateTime(job.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label={t("start_time")}>
            {job.started_at ? apiClient.formatIsoToDateTime(job.started_at) : <Text type="secondary">无</Text>}
          </Descriptions.Item>
          <Descriptions.Item label={t("end_time")}>
            {job.completed_at ? apiClient.formatIsoToDateTime(job.completed_at) : <Text type="secondary">无</Text>}
          </Descriptions.Item>
        </Descriptions>

        {/* 错误信息（仅在有错误时显示） */}
        {job.status === "failed" && job.error && (
          <>
            <Divider orientation="left" style={{ marginTop: "20px" }}>
              <Text strong type="danger">
                错误详情
              </Text>
            </Divider>
            <div
              style={{
                backgroundColor: "#fff2f0",
                padding: "16px",
                borderRadius: "4px",
                border: "1px solid #ffccc7",
              }}
            >
              <Paragraph
                ellipsis={{
                  rows: 3,
                  expandable: true,
                  symbol: t("view_all_logs"),
                }}
                style={{ margin: 0, whiteSpace: "pre-wrap" }}
              >
                {JSON.parse(job.error)}
              </Paragraph>
            </div>
          </>
        )}

        {/* 返回结果（仅在有结果时显示） */}
        {job.status === "success" && job.result && (
          <>
            <Divider orientation="left" style={{ marginTop: "20px" }}>
              <Text strong>返回结果</Text>
            </Divider>
            <div
              style={{
                backgroundColor: "#f6ffed",
                padding: "16px",
                borderRadius: "4px",
                border: "1px solid #b7eb8f",
              }}
            >
              <pre className="json" style={{ margin: 0 }}>
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          </>
        )}

        {/* 参数信息 */}
        {(job.args || job.kwargs) && (
          <>
            <Divider orientation="left" style={{ marginTop: "20px" }}>
              <Text strong>任务参数</Text>
            </Divider>
            <Descriptions column={1} size="small">
              {job.args && (
                <Descriptions.Item label="args">
                  <pre className="json">{job.args}</pre>
                </Descriptions.Item>
              )}
              {job.kwargs && (
                <Descriptions.Item label="kwargs">
                  <pre className="json">{job.kwargs}</pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {/* 实时日志（通过 WebSocket） */}
        <Divider orientation="left" style={{ marginTop: "20px" }}>
          <Space>
            <Text strong>实时日志</Text>
            {renderWsStatus()}
          </Space>
        </Divider>
        <div
          style={{
            border: "1px solid #434343",
            borderRadius: "4px",
            backgroundColor: "#001529",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 12px",
              backgroundColor: "#002140",
              borderBottom: "1px solid #434343",
            }}
          >
            <Text style={{ color: "#8c8c8c", fontSize: "12px", fontFamily: "monospace" }}>
              [{job.task_id}]
            </Text>
            <Space size={4}>
              <Tooltip title={isPaused ? "继续滚动" : "暂停滚动"}>
                <Button
                  size="small"
                  type={isPaused ? "primary" : "default"}
                  icon={isPaused ? <CaretRightOutlined /> : <PauseOutlined />}
                  onClick={handlePauseToggle}
                  style={{ fontSize: "12px" }}
                />
              </Tooltip>
              <Tooltip title="清空日志">
                <Button
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={handleClearLogs}
                  danger
                  style={{ fontSize: "12px" }}
                />
              </Tooltip>
              <Tooltip title="下载日志">
                <Button
                  size="small"
                  icon={<CloudDownloadOutlined />}
                  onClick={handleDownloadLogs}
                  style={{ fontSize: "12px" }}
                />
              </Tooltip>
            </Space>
          </div>
          <div
            ref={scrollRef}
            style={{
              height: "300px",
              overflowY: "auto",
              padding: "12px",
              fontFamily: '"Fira Code", Consolas, monospace',
              fontSize: "12px",
              lineHeight: "1.6",
              color: "#d1d5db",
            }}
          >
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                暂无日志输出
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ display: "flex", marginBottom: "2px" }}>
                  <span
                    style={{
                      width: "110px",
                      flexShrink: 0,
                      color: "#4b5563",
                      userSelect: "none",
                    }}
                  >
                    {log.timestamp}
                  </span>
                  <span
                    style={{
                      width: "60px",
                      flexShrink: 0,
                      color: levelColor(log.level),
                      fontWeight: "bold",
                    }}
                  >
                    {log.level}
                  </span>
                  <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 完整 JSON 数据 */}
        <Divider orientation="left" style={{ marginTop: "20px" }}>
          <Text strong>原始数据</Text>
        </Divider>
        <pre
          style={{
            backgroundColor: "#f5f5f5",
            padding: "16px",
            borderRadius: "4px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {JSON.stringify(job, null, 2)}
        </pre>
      </div>
    </Modal>
  );
}