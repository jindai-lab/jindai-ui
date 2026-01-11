import { useState, useEffect } from "react";
import { apiClient as api } from "../api";
import { message, Button } from "antd";

export default function TaskPage() {

  const [stats, setStats] = useState({})
  useEffect(() => {

    const refreshStats = async () => {
      const res = await api.callAPI('worker')
      if (res) setStats(res)
    }

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
    <h2>任务运行状态</h2>
    <div>挂起：{stats.pending}</div>
    <div>运行：{stats.processing}</div>
    <div>结束：{stats.completed}</div>
    <div>失败：{stats.failed}</div>
    <Button onClick={updateEmbeddings}>更新Embeddings</Button>
  </>)
}