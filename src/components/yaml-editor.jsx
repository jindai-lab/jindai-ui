import { useState, useRef, useEffect } from 'react';
import { Card, Tag, Button, Space, Typography, message, Tooltip, Alert } from 'antd';
import yaml from 'js-yaml';
import {
  FileCode,
  Save,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
// Import a PrismJS theme for styling, e.g., 'prism.css' or another theme
import 'prismjs/themes/prism.css'; 
import 'prismjs/components/prism-yaml';
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const YamlEditor = ({ initialValue = '', onSave, onValidate }) => {
const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => setValue(initialValue), [initialValue])

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
      message.error(t("yaml_格式有误请修正后再保存"));
      return;
    }
    if (onSave) {
      onSave(value);
      setIsDirty(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    message.info(t("代码已复制到剪贴板"));
  };

  const formatYaml = () => {
    try {
      const obj = yaml.load(value);
      const formatted = yaml.dump(obj, { indent: 2 });
      setValue(formatted);
      message.success(t("已自动格式化"));
    } catch (e) {
      message.error(t("格式化失败yaml_结构不正确"));
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
     <div style={{ 
      height: '500px', 
      border: '1px solid #fff', 
      borderRadius: '4px',
      overflow: 'auto',
    }}>
      <Editor
        value={value}
        onValueChange={handleEditorChange}
        highlight={code => highlight(code, languages.yaml)}
        placeholder="Enter YAML here..."
        padding={16}
        style={{
          fontFamily: '"Fira Code", "Fira Mono", monospace',
          fontSize: 14,
          minHeight: '100%',
          backgroundColor: 'transparent',
        }}
      />
    </div>
    </Card>
  );
};

export default YamlEditor;