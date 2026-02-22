import {
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";
import {
  Collapse,
  Descriptions,
  Divider,
  Modal,
  Spin,
  Tag,
  Typography
} from "antd";
import { apiClient } from "../api.js";

const { Text, Paragraph } = Typography;


export function JobDetail({ job, jobId, visible, onCancel }) {
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
              <JobStatusTag status={job.status} />
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

export function JobStatusTag({ status }) {
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
    case "STARTED":
    case "RUNNING":
      return <Tag>运行中</Tag>;
    default:
      return (
        <Tag icon={<ExclamationCircleOutlined />} color="error">
          执行失败
        </Tag>
      );
  }
  return (<Tag>{status}</Tag>)
}
