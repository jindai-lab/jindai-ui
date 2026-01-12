import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { Button, Card, Col, message, Row, Statistic } from "antd";
import { useEffect, useState } from "react";
import { apiClient as api } from "../api";

export default function TaskPage() {

  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)

  const refreshStats = async () => {
    setLoading(true)
    const res = await api.callAPI('worker')
    if (res) {
      setStats(res)
      setLoading(false)
    }
  }

  useEffect(() => {

    const interval =
      setInterval(refreshStats, 5000);;

    refreshStats()

    // 必须清除定时器，防止组件销毁后继续运行或重复创建
    return () => clearInterval(interval);
  }, []);

  const updateEmbeddings = async () => {
    await api.callAPI('worker', { task_type: 'text_embedding', params: {} }, { method: 'POST' });
    message.info('成功添加任务')
  }

  return (<>
    <Card
      title="任务运行状态"
      extra={
        <Button
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={refreshStats}
        >
          手动刷新
        </Button>
      }
      style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      {typeof stats.processing === 'undefined' && '正在加载...'}
      {typeof stats.processing !== 'undefined' && (
      <Row gutter={16} >
        <Col span={6}>
          <Card variant="soft" color="warning">
            <Statistic
              title="挂起"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="soft" color="primary">
            <Statistic
              title="运行中"
              value={stats.processing}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="soft" color="success">
            <Statistic
              title="已结束"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="soft" color="error">
            <Statistic
              title="失败"
              value={stats.failed}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />

          </Card>
        </Col>
      </Row>
      )}
    </Card>
    <Card title="任务操作">
      <Button onClick={updateEmbeddings}>更新 Embeddings</Button>
    </Card>
  </>
  );
}