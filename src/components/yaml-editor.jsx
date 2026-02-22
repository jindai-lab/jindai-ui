import { useState, useRef } from 'react';
import { Card, Tag, Button, Space, Typography, message, Tooltip, Alert } from 'antd';
import Editor from '@monaco-editor/react';
import yaml from 'js-yaml';
import {
  FileCode,
  Save,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const { Text } = Typography;

const YamlEditor = ({ initialValue = '', onSave, onMount, beforeMount, onValidate }) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef(null);

  // 实时校验 YAML 格式
  const handleEditorChange = (newValue) => {
    const content = newValue || '';
    setValue(content);
    setIsDirty(true);

    try {
      const edited = yaml.load(content)
      if (onValidate) onValidate(edited)
      setError(null);
    } catch (e) {
      // 捕获并显示解析错误（如缩进错误）
      setError(e.message);
    }
  };

  const handleSave = () => {
    if (error) {
      message.error('YAML 格式有误，请修正后再保存');
      return;
    }
    if (onSave) {
      onSave(value);
      setIsDirty(false);
      message.success('配置已保存');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    message.info('代码已复制到剪贴板');
  };

  const formatYaml = () => {
    try {
      const obj = yaml.load(value);
      const formatted = yaml.dump(obj, { indent: 2 });
      setValue(formatted);
      message.success('已自动格式化');
    } catch (e) {
      message.error('格式化失败：YAML 结构不正确');
    }
  };

  return (
    <Card
      title={
        <Space>
          <FileCode size={18} className="text-blue-500" />
          <span>代码编辑器</span>
          {isDirty && <Tag color="gold">未保存</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="自动格式化">
            <Button
              icon={<RefreshCw size={14} />}
              onClick={formatYaml}
              size="small"
            />
          </Tooltip>
          <Tooltip title="复制代码">
            <Button
              icon={<Copy size={14} />}
              onClick={copyToClipboard}
              size="small"
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<Save size={14} />}
            onClick={handleSave}
            disabled={!!error || !isDirty}
            size="small"
          >
            保存配置
          </Button>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
      className="shadow-md border-slate-200"
    >
      {/* 错误提示区域 */}
      {error && (
        <Alert
          title="语法错误"
          description={<pre className="text-xs mb-0">{error}</pre>}
          type="error"
          showIcon
          icon={<AlertCircle size={16} />}
          style={{ borderRadius: 0 }}
        />
      )}
      {!error && (
        <div className="bg-green-50 px-4 py-1 border-b border-green-100 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-500" />
          <Text type="success" style={{ fontSize: '12px' }}>YAML 格式合法</Text>
        </div>
      )}

      {/* Monaco 编辑器 */}
      <div style={{ height: '500px' }}>
        <Editor
          height="100%"
          defaultLanguage="yaml"
          theme="vs-dark" // 也可以使用 "light"
          value={value}
          onChange={handleEditorChange}
          onMount={(editor) => { editorRef.current = editor; if (onMount) onMount(editor); }}
          beforeMount={beforeMount}
          options={{
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 16, bottom: 16 },
            fontFamily: "monospace",
            renderLineHighlight: 'all',
            cursorSmoothCaretAnimation: 'on',
            minimap: { enabled: false },
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: false,
          }}
        />
      </div>

      {/* 底部信息栏 */}
      <div className="bg-slate-50 px-4 py-1 text-[11px] text-slate-400 border-t flex justify-between">
        <span>字符数: {value.length}</span>
        <span>制表符: 2 Spaces</span>
      </div>
    </Card>
  );
};

export default YamlEditor;