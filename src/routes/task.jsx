import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  SyncOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api.js";
import ParamPanel from "../components/param-panel.jsx";
import { useWorkerStats } from "../components/ws-workerstats.jsx";

import { JobsList } from "../components/jobs-list.jsx";
import { useTranslation } from "react-i18next";


// 数据库taskdbo列表展示组件
const TaskDboList = () => {
  const { t } = useTranslation();
  // 状态管理：任务列表、加载中、请求异常
  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  // 从数据库/后端接口 获取taskdbo数据
  const getTaskDboData = async () => {
    const { results } = (await apiClient.listTaskDbos()) || { results: [] };
    setTaskList(results);
    setLoading(false);
  };

  const runTask = async (task_id) => {
    const jobId = await apiClient.workerSubmitTask('custom', { task_id });
    console.log(jobId);
    message.info(t("task_created", { jobId }));
  };

  const deleteTask = async (task_id) => {
    await apiClient.workerJobDelete(task_id);
    message.success(t("task_deleted", { taskId: task_id }));
    getTaskDboData();
  };

  // 组件挂载时加载数据，空数组依赖仅执行一次
  useEffect(() => {
    getTaskDboData();
  }, []);

  // 表格列配置 - 完全适配taskdbo数据库表字段
  const tableColumns = [
    {
      title: t("task_name"),
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: t("concurrency"),
      dataIndex: "concurrent",
      key: "concurrent",
      width: 100,
      align: "center",
      render: (num) => <span style={{ color: "#165DFF" }}>{num}</span>,
    },
    {
      title: t("last_execution_time"),
      dataIndex: "last_run_time",
      key: "last_run_time",
      width: 200,
      render: (time) => (
        <Space>
          <ClockCircleOutlined />
          <span>{time || t("no_execution_records")}</span>
        </Space>
      ),
    },
    {
      title: t("resume_next"),
      dataIndex: "resume_next",
      key: "resume_next",
      width: 120,
      align: "center",
      render: (isResume) =>
        isResume ? (
          <Tag color="processing">{t("yes")}</Tag>
        ) : (
          <Tag color="gray">{t("no")}</Tag>
        ),
    },
    {
      title: t("action"),
      key: "operation",
      render: (record) => {
        return (
          <>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            >
              {t("edit")}
            </Button>
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => runTask(record.id)}
            >
              {t("run")}
            </Button>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => deleteTask(record.id)}
              danger
            >
              {t("delete")}
            </Button>
          </>
        );
      },
    },
  ];

  return (
    <div
      style={{
        padding: "20px",
        background: "var(--panel-bg)",
        minHeight: "calc(100vh - 120px)",
        color: "var(--text)",
      }}
    >
      {/* 加载中状态 */}
      <Spin spinning={loading} tip={t("loading_task_data_from_database")}>
        {/* 异常提示 */}
        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 核心表格展示 */}
        <Table
          columns={tableColumns}
          dataSource={taskList}
          rowKey="id"
          bordered
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
              showTotal: (total) => t("total_tasks", { total }),
          }}
          scroll={{ x: "max-content" }}
          // 空数据兜底
          locale={{ emptyText: <Empty description={t("no_task_data")} /> }}
        />
      </Spin>
    </div>
  );
};

export default function TaskPage() {
  const { t } = useTranslation();
  const [embeddingsStats, setEmbeddingsStats] = useState({});
  const [taskTypes, setTaskTypes] = useState({});
  const [activeTaskType, setActiveTaskType] = useState('');
  const [activeTaskParams, setActiveTaskParams] = useState({});

  const { stats, startWorkerStats, stopWorkerStats } = useWorkerStats();

  const refreshEmbeddingsCount = async () => {
    const tasks = await apiClient.workerRegisteredTasks();
    setTaskTypes(tasks);
    const res = await apiClient.embeddingStats();
    if (res) {
      setEmbeddingsStats(res);
    }
  };

  useEffect(() => {
    refreshEmbeddingsCount();
    startWorkerStats();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopWorkerStats();
      } else {
        startWorkerStats();
        refreshEmbeddingsCount();
      }
    };

    // document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopWorkerStats();
      // document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  const clearTasks = () => {
    Modal.confirm({
      title: t("clear_all_tasks_confirm_title"),
      content: t("clear_all_tasks_confirm_content"),
      okText: t("confirm"),
      cancelText: t("cancel"),
      okButtonProps: { danger: true },
      onOk: async () => {
        await apiClient.workerClearJobs();
        message.success(t("tasks_cleared"));
      },
    });
  };

  return (
    <>
      <Card
        title={t("task_run_status")}
        extra={
          <>
            <Button onClick={clearTasks} danger icon={<DeleteOutlined />}>
              {t("clear_tasks")}
            </Button>
          </>
        }
        style={{
          background: "var(--panel-bg)",
          color: "var(--text)",
          borderColor: "var(--border)",
          marginBottom: 16,
        }}
      >
        {typeof stats.processing === "undefined" && t("loading")}
        {typeof stats.processing !== "undefined" && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card variant="soft" color="warning">
                  <Statistic
                    title={t("status_queued")}
                    value={stats.queued}
                    prefix={<ClockCircleOutlined />}
                    styles={{ content: { color: "#faad14" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="primary">
                  <Statistic
                    title={t("status_running")}
                    value={stats.processing}
                    prefix={<SyncOutlined />}
                    styles={{ content: { color: "#1890ff" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="success">
                  <Statistic
                    title={t("status_completed")}
                    value={stats.success}
                    prefix={<CheckCircleOutlined />}
                    styles={{ content: { color: "#52c41a" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="error">
                  <Statistic
                    title={t("status_failed")}
                    value={stats.failed}
                    prefix={<CloseCircleOutlined />}
                    styles={{ content: { color: "#f5222d" } }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
        <Row style={{marginTop: '1rem'}}>
          <JobsList jobs={stats.results || []} />
        </Row>
      </Card>
      <Card title={t("task_list")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Row>
          <TaskDboList />
        </Row>
      </Card>
      <Card title={t("maintenance_tasks")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Row>{t("embeddings_info", { finished: embeddingsStats.finished, queued: embeddingsStats.queued })}</Row>
        <Form>
          <Form.Item label={t("task_type")}>
            <Select style={{ width: 200 }} options={Object.keys(taskTypes).filter(name => name != 'custom').map(name => {
              return { value: name, display: name }
            })} onChange={(val) => setActiveTaskType(val)}></Select>
          </Form.Item>
          {activeTaskType && taskTypes[activeTaskType] && (
            <ParamPanel scheme={taskTypes[activeTaskType]} value={activeTaskParams} onChange={setActiveTaskParams} />
          )}
          <Button type="primary" onClick={async () => {
            if (activeTaskType) {
              const jobId = await apiClient.workerSubmitTask(activeTaskType, activeTaskParams);
              message.info(t("maintenance_task_created", { jobId }))
            }
          }}>{t("run")}</Button>
        </Form>
      </Card>
      <div style={{ paddingBottom: 50 }}></div>
    </>
  );
}
