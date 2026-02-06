import { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag, Space, Typography, Tooltip, Empty } from 'antd';
import { 
  Terminal, 
  Pause, 
  Play, 
  Trash2, 
  Download, 
  Info, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const { Text } = Typography;

const LogsViewer = ({ taskId }) => {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState('connecting'); // connecting, connected, error
  const scrollRef = useRef(null);
  const eventSourceRef = useRef(null);

  // 自动滚动到底部逻辑
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // SSE 连接管理
  useEffect(() => {
    if (!taskId) return;

    const connect = () => {
      setStatus('connecting');
      const es = new EventSource(`/api/v2/worker/logs/${taskId}`); // TODO: THIS IS OBSOLETE
      eventSourceRef.current = es;

      es.onopen = () => setStatus('connected');
      
      es.onmessage = (event) => {
        if (!isPaused) {
          setLogs((prev) => [...prev, event.data]);
        }
      };

      es.onerror = () => {
        setStatus('error');
        es.close();
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [taskId]);

  // 功能函数
  const handleDownload = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-${taskId}.log`;
    link.click();
  };

  // 渲染状态标签
  const renderStatus = () => {
    const statusMap = {
      connected: <Tag color="success" icon={<CheckCircle2 size={12} className="inline mr-1" />}>运行中 (LIVE)</Tag>,
      connecting: <Tag color="processing" icon={<Info size={12} className="inline mr-1" />}>正在连接...</Tag>,
      error: <Tag color="error" icon={<AlertCircle size={12} className="inline mr-1" />}>连接已断开</Tag>
    };
    return statusMap[status];
  };

  return (
    <Card 
      title={
        <Space>
          <Terminal size={18} />
          <span>任务控制台</span>
          <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'monospace' }}>[{taskId}]</Text>
        </Space>
      }
      extra={
        <Space>
          {renderStatus()}
          <Tooltip title={isPaused ? "继续滚动" : "暂停滚动"}>
            <Button 
              type={isPaused ? "primary" : "default"}
              icon={isPaused ? <Play size={14} /> : <Pause size={14} />} 
              onClick={() => setIsPaused(!isPaused)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="下载日志">
            <Button icon={<Download size={14} />} onClick={handleDownload} size="small" />
          </Tooltip>
          <Tooltip title="清空界面">
            <Button icon={<Trash2 size={14} />} onClick={() => setLogs([])} size="small" danger />
          </Tooltip>
        </Space>
      }
      styles={{ body: { padding: 0, backgroundColor: '#001529' } }}
      className="shadow-lg border-slate-200"
    >
      <div 
        ref={scrollRef}
        style={{ 
          height: '500px', 
          overflowY: 'auto', 
          padding: '16px',
          fontFamily: '"Fira Code", Consolas, monospace',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#d1d5db'
        }}
      >
        {logs.length === 0 && status !== 'error' ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Empty description={<Text style={{color: '#6b7280'}}>暂无日志输出</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex hover:bg-white/5 transition-colors px-1 rounded">
              <span style={{ 
                width: '40px', 
                textAlign: 'right', 
                marginRight: '16px', 
                color: '#4b5563', 
                userSelect: 'none' 
              }}>
                {index + 1}
              </span>
              <span className="whitespace-pre-wrap break-all">{log}</span>
            </div>
          ))
        )}
        {status === 'error' && (
          <div className="text-red-400 mt-2 border-t border-red-900/50 pt-2 flex items-center gap-2">
            <AlertCircle size={14} /> 连接中断，请刷新页面或检查后台服务。
          </div>
        )}
      </div>
      
    </Card>
  );
};

export default LogsViewer;