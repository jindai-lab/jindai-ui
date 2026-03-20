import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Space, Select, Divider, message, Input, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import ParamPanel from './param-panel';
import { apiClient } from '../api';
import { useTranslation } from "react-i18next";

const Pipeline = ({ value = [], onChange, workflowConfig = {}, onWorkflowConfigChange }) => {
  const { t } = useTranslation();
  const [pipelineSchema, setPipelineSchema] = useState([]);
  const [expandedStages, setExpandedStages] = useState({});

  // Fetch pipeline schema on mount
  useEffect(() => {
    const fetchPipelineSchema = async () => {
      try {
        const schemaData = await apiClient.getPipelines();
        const flattened = [];

        // Iterate through categories
        for (const category in schemaData) {
          const components = schemaData[category];

          // Iterate through components in that category
          for (const componentKey in components) {
            const component = components[componentKey];
            flattened.push({
              label: component.name,
              category: category,
              args: component.args,
              doc: component.doc
            });
          }
        }

        setPipelineSchema(flattened);
      } catch (err) {
        console.error(t("get_pipeline_schema_failed"), err);
        message.error(t("get_pipeline_schema_failed"));
      }
    };

    fetchPipelineSchema();
  }, []);

  // Toggle stage expansion
  const toggleStageExpand = (index) => {
    setExpandedStages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Add a new stage
  const addStage = () => {
    const newStage = { '': {} };
    onChange([...value, newStage]);
  };

  // Delete a stage
  const deleteStage = (index) => {
    const newPipeline = [...value];
    newPipeline.splice(index, 1);
    onChange(newPipeline);
  };

  // Move stage up
  const moveUp = (index) => {
    if (index === 0) return;
    const newPipeline = [...value];
    [newPipeline[index - 1], newPipeline[index]] = [newPipeline[index], newPipeline[index - 1]];
    onChange(newPipeline);
  };

  // Move stage down
  const moveDown = (index) => {
    if (index === value.length - 1) return;
    const newPipeline = [...value];
    [newPipeline[index], newPipeline[index + 1]] = [newPipeline[index + 1], newPipeline[index]];
    onChange(newPipeline);
  };

  // Update stage class name
  const updateStageClass = (index, className) => {
    const newPipeline = [...value];
    const currentStage = newPipeline[index];
    const currentParams = Object.values(currentStage)[0] || {};
    
    // Remove old key and add new one
    const newStage = { [className]: currentParams };
    newPipeline[index] = newStage;
    onChange(newPipeline);
  };

  // Update stage parameters
  const updateStageParams = (index, newParams) => {
    const newPipeline = [...value];
    const currentStage = newPipeline[index];
    const currentClass = Object.keys(currentStage)[0];
    newPipeline[index] = { [currentClass]: newParams };
    onChange(newPipeline);
  };

  // Update workflow config
  const updateWorkflowConfig = (field, value) => {
    onWorkflowConfigChange({
      ...workflowConfig,
      [field]: value
    });
  };

  // Get schema for a specific stage class
  const getStageSchema = (className) => {
    return pipelineSchema.find(s => s.label === className);
  };

  // Get all stage class names
  const stageClassOptions = pipelineSchema.map(s => ({
    value: s.label,
    label: `${s.category} - ${s.label}`
  }));

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Workflow Configuration Section */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderLeft: '4px solid var(--primary)',
          position: 'relative'
        }}
        title={
          <Space>
            <span>{t("workflow_config")}</span>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label={t("name")} style={{ marginBottom: 16 }}>
            <Input
              value={workflowConfig.name || ''}
              onChange={(e) => updateWorkflowConfig('name', e.target.value)}
              placeholder={t("enter_workflow_name")}
            />
          </Form.Item>
          <Form.Item label={t("shared")} style={{ marginBottom: 16 }}>
            <Switch
              checked={workflowConfig.shared || false}
              onChange={(checked) => updateWorkflowConfig('shared', checked)}
            />
          </Form.Item>
          <Form.Item label={t("resume_next")} style={{ marginBottom: 16 }}>
            <Switch
              checked={workflowConfig.resume_next !== false}
              onChange={(checked) => updateWorkflowConfig('resume_next', checked)}
            />
          </Form.Item>
          <Form.Item label={t("concurrent")} style={{ marginBottom: 16 }}>
            <Input
              type="number"
              value={workflowConfig.concurrent || 3}
              onChange={(e) => updateWorkflowConfig('concurrent', parseInt(e.target.value, 10) || 0)}
              min={0}
            />
          </Form.Item>
        </Form>
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={addStage} icon={<PlusOutlined />}>
          {t("add_stage")}
        </Button>
      </Space>

      {value.map((stage, index) => {
        const stageClass = Object.keys(stage)[0];
        const stageParams = Object.values(stage)[0] || {};
        const stageSchema = getStageSchema(stageClass);
        console.log(stageSchema)

        return (
          <Card
            key={index}
            size="small"
            style={{
              marginBottom: 16,
              borderLeft: '4px solid var(--primary)',
              position: 'relative'
            }}
            title={
              <Space>
                <span>{t("stage")}</span>
                <span style={{ fontWeight: 'bold' }}>{index + 1}</span>
                {stageClass && (
                  <span style={{ color: 'var(--primary)' }}>
                    ({stageSchema?.category || 'Unknown'} - {stageClass})
                  </span>
                )}
              </Space>
            }
            extra={
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<UpOutlined />}
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  title={t("move_up")}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<DownOutlined />}
                  onClick={() => moveDown(index)}
                  disabled={index === value.length - 1}
                  title={t("move_down")}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => deleteStage(index)}
                  title={t("delete_stage")}
                />
              </Space>
            }
          >
            {/* Stage Class Selector */}
            <Form.Item label={t("stage_class")} style={{ marginBottom: 16 }}>
              <Select
                style={{ width: '100%' }}
                options={stageClassOptions}
                value={stageClass}
                onChange={(val) => updateStageClass(index, val)}
                placeholder={t("select_stage_class")}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            {/* Stage Parameters */}
            {stageClass && stageSchema && (
              <ParamPanel
                scheme={Object.fromEntries(stageSchema.args.map(arg => [arg.name, arg.type]))}
                value={stageParams}
                onChange={(newParams) => updateStageParams(index, newParams)}
              />
            )}
          </Card>
        );
      })}

      {value.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          {t("no_stages_added")}
        </div>
      )}
    </div>
  );
};

export default Pipeline;
