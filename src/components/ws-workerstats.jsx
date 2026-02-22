import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { useAuth } from 'react-oidc-context';

export const useWorkerStats = () => {
  const [stats, setData] = useState([]);
  const auth = useAuth();
  const ws = useRef(null); 

  const startWorkerStats = () => {
    const bearer = auth.user?.access_token;
    const socketUrl = `wss://${location.hostname}/api/ws/jobs/stats?token=${bearer}`;

    if (ws.current != null) return;
    ws.current = new WebSocket(socketUrl);

    // 连接成功
    ws.current.onopen = () => {
      console.log("WebSocket 已连接");
    };

    // 接收消息：核心逻辑
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // 假设后端返回的是数组，直接存入 state 驱动 Antd Table
        setData(data); 
      } catch (error) {
        console.error("解析数据失败:", error);
      }
    };

    // 错误处理
    ws.current.onerror = (err) => {
      console.error(err);
      ws.current = null;
    };

    // 关闭处理
    ws.current.onclose = () => {
      console.log("WebSocket 已断开");
      // 可以在这里实现断线重连逻辑
    };
  };

  // 停止获取的函数
  const stopWorkerStats = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  return { stats, startWorkerStats, stopWorkerStats };
};