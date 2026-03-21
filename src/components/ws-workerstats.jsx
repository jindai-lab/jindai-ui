import { useState, useRef } from 'react';
import { apiClient } from '../api';
import { useTranslation } from "react-i18next";

export const useWorkerStats = () => {
  const { t } = useTranslation();
  const [stats, setData] = useState([]);
  const ws = useRef(null); 

  const startWorkerStats = () => {
    const socketUrl = `wss://${location.hostname}/api/ws/maintenance/jobs/stats`;

    if (ws.current != null) return;
    ws.current = new WebSocket(socketUrl);
    
    // Send subscribe message after connection
    ws.current.onopen = () => {
      console.log(t("websocket_connected"));
      ws.current.send(JSON.stringify({ action: "subscribe" }));
    };

    // 接收消息：核心逻辑
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // 假设后端返回的是数组，直接存入 state 驱动 Antd Table
        setData(data); 
      } catch (error) {
        console.error(t("parse_data_failed"), error);
      }
    };

    // 错误处理
    ws.current.onerror = (err) => {
      console.error(err);
      ws.current = null;
    };

    // 关闭处理
    ws.current.onclose = () => {
      console.log(t("websocket_disconnected"));
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