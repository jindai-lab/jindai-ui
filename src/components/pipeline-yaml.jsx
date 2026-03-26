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
import 'prismjs/themes/prism.css'; 
import 'prismjs/components/prism-yaml';
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const PipelineYaml = ({ initialValue = '', onChange, onSave, onSyncVisual }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => setValue(initialValue), [initialValue])

  // Real-time YAML validation and sync
  const handleEditorChange = (newValue) => {
    const content = newValue || '';
    setValue(content);
    setIsDirty(true);

    try {
      const parsed = yaml.load(content);
      if (Array.isArray(parsed)) {
        setError(null);
        if (onChange) {
          onChange(parsed);
        }
        if (onSyncVisual) {
          onSyncVisual(parsed);
        }
      } else {
        setError(t("pipeline_should_be_array"));
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = () => {
    if (error) {
      message.error(t("yaml_format_error_please_fix"));
      return;
    }
    if (onSave) {
      onSave(value);
      setIsDirty(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    message.info(t("code_copied_to_clipboard"));
  };

  const formatYaml = () => {
    try {
      const obj = yaml.load(value);
      const formatted = yaml.dump(obj, { indent: 2 });
      setValue(formatted);
      if (onChange) {
        onChange(obj);
      }
      if (onSyncVisual) {
        onSyncVisual(obj);
      }
      message.success(t("auto_formatted"));
    } catch (e) {
      message.error(t("format_failed_yaml_structure_error"));
    }
  };

  return (
    <Card
      title={
        <Space>
          <FileCode size={18} className="text-blue-500" />
          <span>{t("source_code")}</span>
          {isDirty && <Tag color="gold">{t("unsaved")}</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title={t("auto_format")}>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={formatYaml}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t("copy_code")}>
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
            {t("save")}
          </Button>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
      className="shadow-md border-slate-200"
    >
      {/* Error message area */}
      {error && (
        <Alert
          title={t("syntax_error")}
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
          <Text type="success" style={{ fontSize: '12px' }}>{t("yaml_valid")}</Text>
        </div>
      )}

      {/* Editor */}
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
          placeholder={t("enter_yaml_here")}
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

export default PipelineYaml;
