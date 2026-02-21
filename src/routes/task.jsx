import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Popconfirm,
  Select,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ParamPanel from "../components/param-panel.jsx";
import "./task.css";
import { apiClient } from "../api.js"

const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;

// 数据库taskdbo列表展示组件
const TaskDboList = () => {
  // 状态管理：任务列表、加载中、请求异常
  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  // 从数据库/后端接口 获取taskdbo数据
  const getTaskDboData = async () => {
    const { results } = (await apiClient.taskDBO()) || { results: [] };
    setTaskList(results);
    setLoading(false);
  };

  const runTask = async (task_id) => {
    const jobId = await apiClient.workerSubmitTask('custom', { task_id });
    console.log(jobId);
    message.info(`已创建任务 ${jobId}`);
  };

  // 组件挂载时加载数据，空数组依赖仅执行一次
  useEffect(() => {
    getTaskDboData();
  }, []);

  // 表格列配置 - 完全适配taskdbo数据库表字段
  const tableColumns = [
    {
      title: "任务名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "并发数",
      dataIndex: "concurrent",
      key: "concurrent",
      width: 100,
      align: "center",
      render: (num) => <span style={{ color: "#165DFF" }}>{num}</span>,
    },
    {
      title: "最后执行时间",
      dataIndex: "last_run_time",
      key: "last_run_time",
      width: 200,
      render: (time) => (
        <Space>
          <ClockCircleOutlined />
          <span>{time || "暂无执行记录"}</span>
        </Space>
      ),
    },
    {
      title: "是否续跑",
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
      title: "操作",
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
          </>
        );
      },
    },
  ];

  return (
    <div
      style={{
        padding: "20px",
        background: "#fff",
        minHeight: "calc(100vh - 120px)",
      }}
    >
      {/* 加载中状态 */}
      <Spin spinning={loading} tip="正在从数据库加载任务数据...">
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
          locale={{ emptyText: <Empty description="暂无任务数据" /> }}
        />
      </Spin>
    </div>
  );
};

function JobDetail({ job, jobId, visible, onCancel }) {
  return (
    <Modal
      title={`详情 - ${jobId}`}
      open={visible}
      onCancel={onCancel}
      width={800}
      maskClosable={false} // 点击遮罩层不关闭弹窗
      footer={null} // 隐藏默认底部按钮（如需可自定义）
    >
      {!job ? (
        // 加载中状态
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
          <span style={{ display: "block", marginTop: 16 }}>
            正在获取 {jobId} 详情...
          </span>
        </div>
      ) : (
        // 成功获取详情（根据实际返回结构调整展示方式）
        <div style={{ padding: "10px 0" }}>
          <h3>基本信息</h3>
          <Descriptions
            column={2}
            bordered
            size="middle"
            labelStyle={{ fontWeight: "bold" }}
          >
            <Descriptions.Item label="执行状态">
              {JobStatusTag(job.status)}
            </Descriptions.Item>
            <Descriptions.Item label="日志内容" span={2}>
              {job.log ? (
                <Paragraph
                  ellipsis={{
                    rows: 2,
                    expandable: true,
                    symbol: "查看全部日志",
                  }}
                  style={{ margin: 0 }}
                >
                  {job.log}
                </Paragraph>
              ) : (
                <Text type="secondary">无日志信息</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="入列时间" span={1}>
              {apiClient.formatIsoToDateTime(job.enqueue_time)}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间" span={1}>
              {apiClient.formatIsoToDateTime(job.date_done)}
            </Descriptions.Item>
            <Descriptions.Item label="任务名称" span={1}>
              {job.task_name ? (
                job.task_name
              ) : (
                <Text type="secondary">无返回值</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="参数" span={2}>
              <pre className="json">
                kwargs: {JSON.stringify(job.kwargs, null, 2)}
              </pre>
              <pre className="json">
                args: {JSON.stringify(job.args, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="返回值" span={2}>
              {job.return_value ? (
                <pre className="json">
                  {JSON.stringify(job.return_value, null, 2)}
                </pre>
              ) : (
                <Text type="secondary">无返回值</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          {/* 错误信息（仅在有错误时显示） */}
          {job.status != "SUCCESS" && job.error && (
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
                {job.error}
              </div>
              <pre className="json">{job.traceback}</pre>
            </>
          )}

          {/* 标签信息 */}
          {Object.keys(job.labels || {}).length > 0 && (
            <>
              <Divider orientation="left" style={{ marginTop: "20px" }}>
                <Text strong>标签信息</Text>
              </Divider>
              <pre className="json">{JSON.stringify(job.labels, null, 2)}</pre>
            </>
          )}

          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "16px",
              borderRadius: "4px",
              whiteSpace: "pre-wrap", // 自动换行
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(job, null, 2)}
          </pre>
        </div>
      )}
    </Modal>
  );
}

function JobStatusTag(status) {
  switch (status) {
    case "SUCCESS":
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          执行成功
        </Tag>
      );
    case "PENDING":
      return <Tag>挂起</Tag>;
    case "PROCESSING":
      return <Tag>运行中</Tag>;
    default:
      return (
        <Tag icon={<ExclamationCircleOutlined />} color="error">
          执行失败
        </Tag>
      );
  }
}

function JobsList() {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentJobId, setCurrentJobId] = useState("");
  const [jobDetail, setJobDetail] = useState(null);

  const [jobs, setJobs] = useState([]);

  const loadDetailedStats = async (expanded) => {
    if (!expanded) return;
    const { results } = await apiClient.workerJobsList();
    setJobs(results);
  };

  const removeJob = async (jobId) => {
    await apiClient.workerJobDelete(jobId);
    await loadDetailedStats(true);
  };

  const jobColumns = [
    {
      title: "ID",
      key: "job_id",
      // 点击 ID 触发弹窗
      render: (record) => (
        <span
          onClick={() => handleJobClick(record.job_id)}
          style={{ color: "#1890ff", cursor: "pointer" }}
        >
          <Tag>{record.task_name}</Tag>
          {record.job_id}
        </span>
      ),
    },
    {
      title: "入列时间",
      key: "enqueue_time",
      dataIndex: "enqueue_time",
      render: (dt) => apiClient.formatIsoToDateTime(dt),
    },
    {
      title: "完成状态",
      dataIndex: "status",
      key: "status",
      render: JobStatusTag,
    },
    {
      title: "操作",
      key: "operation",
      render: (record) => {
        return (
          <>
            <Popconfirm
              title={`确定删除【${record.job_id}】吗？`}
              onConfirm={() => removeJob(record.job_id)}
              okText="确定"
              cancelText="取消"
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

  const handleJobClick = async (jobId) => {
    setCurrentJobId(jobId);
    setModalVisible(true);
    setJobDetail(null);

    try {
      // 调用 API 获取 job 详情
      const result = await apiClient.workerJob(jobId);
      setJobDetail(result);
    } catch (err) {
      // 捕获 API 调用错误
      message.error(`获取 Job ${jobId} 详情失败：${err.message || "未知错误"}`);
    } finally {
    }
  };

  return (
    <Collapse defaultActiveKey={[]} onChange={loadDetailedStats}>
      <Panel header="结果详情" key="detailed">
        <Table
          columns={jobColumns}
          dataSource={jobs.map((job) => ({ key: job.job_id, ...job }))}
          pagination={false} // 关闭分页（如果数据多可以开启）
          size="middle"
          bordered
        />
        <JobDetail
          jobId={currentJobId}
          job={jobDetail}
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
        />
      </Panel>
    </Collapse>
  );
}

export default function TaskPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [embeddingsStats, setEmbeddingsStats] = useState({});
  const [taskTypes, setTaskTypes] = useState({});
  const [activeTaskType, setActiveTaskType] = useState('');
  const [activeTaskParams, setActiveTaskParams] = useState({});

  const refreshStats = async () => {
    setLoading(true);
    const res = await apiClient.workerStats();
    if (res) {
      setStats(res);
      setLoading(false);
    }
  };

  const refreshEmbeddingsCount = async () => {
    const res = await apiClient.embeddingStats();
    if (res) {
      setEmbeddingsStats((prev) => {
        prev.count = res;
        return prev;
      });
    }
    const tasks = await apiClient.taskTypes();
    setTaskTypes(tasks);
  };

  useEffect(() => {
    const interval = setInterval(refreshStats, 5000);
    refreshStats();
    refreshEmbeddingsCount();
    return () => clearInterval(interval);
  }, []);

  const updateEmbeddings = async () => {
    await apiClient.workerSubmitTask("text_embedding", {});
    message.info("成功添加任务");
  };

  const clearTasks = async () => {
    await apiClient.workerClearJobs();
    message.info("已清除任务");
  };

  return (
    <>
      <Card
        title="任务运行状态"
        extra={
          <>
            <Button
              type="primary"
              icon={<SyncOutlined spin={loading} />}
              onClick={refreshStats}
            >
              手动刷新
            </Button>
            &nbsp;
            <Button onClick={clearTasks} danger icon={<DeleteOutlined />}>
              清空任务
            </Button>
          </>
        }
      >
        {typeof stats.running === "undefined" && "正在加载..."}
        {typeof stats.running !== "undefined" && (
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
                    value={stats.running}
                    prefix={<SyncOutlined />}
                    styles={{ content: { color: "#1890ff" } }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card variant="soft" color="success">
                  <Statistic
                    title="已结束"
                    value={stats.completed}
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
          <JobsList />
        </Row>
      </Card>
      <Card title="任务列表">
        <Row>
          <TaskDboList />
        </Row>
      </Card>
      <Card title="维护任务">
        <Row>总数：{embeddingsStats.count}</Row>
        <Select style={{width: 200}} options={Object.entries(taskTypes).map(([name, params]) => {
            return {value: name, display: name}
          })} onChange={(val) => setActiveTaskType(val)}></Select>
        { activeTaskType && taskTypes[activeTaskType] && (
          <ParamPanel scheme={taskTypes[activeTaskType]} value={activeTaskParams} onChange={setActiveTaskParams} />
        ) }
        <Button type="primary" onClick={async () => {
          if (activeTaskType) {
            const jobId = await apiClient.workerSubmitTask(activeTaskType, activeTaskParams);
            message.info(`创建了维护任务 ${jobId}`)
          }
        }}>运行</Button>
      </Card>
      <div style={{paddingBottom: 50}}></div>
    </>
  );
}
