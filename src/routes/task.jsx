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
import "./task.css";

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
    message.info(`已创建任务 ${jobId}`);
  };

  const deleteTask = async (task_id) => {
    await apiClient.workerJobDelete(task_id);
    message.success(`任务 ${task_id} 已删除`);
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
          <Tag color="processing">是</Tag>
        ) : (
          <Tag color="gray">否</Tag>
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
              编辑
            </Button>
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => runTask(record.id)}
            >
              运行
            </Button>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => deleteTask(record.id)}
              danger
            >
              删除
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
            showTotal: (total) => `共 ${total} 条任务数据`,
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

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopWorkerStats();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  const clearTasks = async () => {
    await apiClient.workerClearJobs();
    message.info(t("tasks_cleared"));
  };

  return (
    <>
      <Card
        title="任务运行状态"
        extra={
          <>
            <Button onClick={clearTasks} danger icon={<DeleteOutlined />}>
              清空任务
            </Button>
          </>
        }
        style={{
          background: "var(--panel-bg)",
          color: "var(--text)",
          borderColor: "var(--border)",
        }}
      >
        {typeof stats.processing === "undefined" && t("loading")}
        {typeof stats.processing !== "undefined" && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card variant="soft" color="warning">
                  <Statistic
                    title="挂起"
                    value={stats.queued}
                    prefix={<ClockCircleOutlined />}
                    styles={{ content: { color: "#faad14" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="primary">
                  <Statistic
                    title="运行中"
                    value={stats.processing}
                    prefix={<SyncOutlined />}
                    styles={{ content: { color: "#1890ff" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="success">
                  <Statistic
                    title="已结束"
                    value={stats.success}
                    prefix={<CheckCircleOutlined />}
                    styles={{ content: { color: "#52c41a" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="error">
                  <Statistic
                    title="失败"
                    value={stats.failed}
                    prefix={<CloseCircleOutlined />}
                    styles={{ content: { color: "#f5222d" } }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
        <Row>
          <JobsList jobs={stats.results || []} />
        </Row>
      </Card>
      <Card title="任务列表" style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}>
        <Row>
          <TaskDboList />
        </Row>
      </Card>
      <Card title="维护任务" style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}>
        <Row>Embeddings 总数：{embeddingsStats.finished} / 列队：{embeddingsStats.queued}</Row>
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
              message.info(`创建了维护任务 ${jobId}`)
            }
          }}>运行</Button>
        </Form>
      </Card>
      <div style={{ paddingBottom: 50 }}></div>
    </>
  );
}
