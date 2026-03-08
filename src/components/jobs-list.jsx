import { useState } from "react";
import { Collapse, Popconfirm, Button, Table, Tag } from "antd";
import { DeleteOutlined  } from "@ant-design/icons"
import { JobStatusTag, JobDetail } from "./job-widgets";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";

export function JobsList({ jobs }) {
const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentJobId, setCurrentJobId] = useState("");
  const [jobDetail, setJobDetail] = useState(null);

  const removeJob = async (jobId) => {
    await apiClient.workerJobDelete(jobId);
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
      title: t("enqueue_time"),
      key: "enqueue_time",
      dataIndex: "enqueue_time",
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
              title={`确定删除【${record.job_id}】吗？`}
              onConfirm={() => removeJob(record.job_id)}
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
      message.error(`获取 Job ${jobId} 详情失败：${err.message || t("unknown_error")}`);
    } finally {
    }
  };

  return (
    <Collapse defaultActiveKey={[]}>
      <Collapse.Panel header={t("result_details")} key="detailed">
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
      </Collapse.Panel>
    </Collapse>
  );
}
