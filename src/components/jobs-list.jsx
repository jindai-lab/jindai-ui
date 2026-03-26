import { useState } from "react";
import { Collapse, Popconfirm, Button, Table, Tag, Modal, Descriptions, Divider, Typography, Spin } from "antd";
import { DeleteOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
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
          job={currentJob}
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
        />
      </Collapse.Panel>
    </Collapse>
  );
}

function JobDetailModal({ job, visible, onCancel }) {
  const { t } = useTranslation();

  if (!job) {
    return null;
  }

  return (
    <Modal
      title={`详情 - ${job.task_id}`}
      open={visible}
      onCancel={onCancel}
      width={800}
      maskClosable={false}
      footer={null}
    >
      {!job ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
          <span style={{ display: "block", marginTop: 16 }}>
            正在获取详情...
          </span>
        </div>
      ) : (
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
      )}
    </Modal>
  );
}
