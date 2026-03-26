import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Space, Select, Divider, message, Input, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import ParamPanel from './param-panel';
import { apiClient } from '../api';
import { useTranslation } from "react-i18next";

const PipelineVisual = ({ value = [], onChange, pipelineSchema = {}, onSyncYaml }) => {
  const { t } = useTranslation();
  const [expandedStages, setExpandedStages] = useState({});

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
    const newPipeline = [...value, newStage];
    onChange(newPipeline);
    if (onSyncYaml) {
      onSyncYaml(newPipeline);
    }
  };

  // Delete a stage
  const deleteStage = (index) => {
    const newPipeline = [...value];
    newPipeline.splice(index, 1);
    onChange(newPipeline);
    if (onSyncYaml) {
      onSyncYaml(newPipeline);
    }
  };

  // Move stage up
  const moveUp = (index) => {
    if (index === 0) return;
    const newPipeline = [...value];
    [newPipeline[index - 1], newPipeline[index]] = [newPipeline[index], newPipeline[index - 1]];
    onChange(newPipeline);
    if (onSyncYaml) {
      onSyncYaml(newPipeline);
    }
  };

  // Move stage down
  const moveDown = (index) => {
    if (index === value.length - 1) return;
    const newPipeline = [...value];
    [newPipeline[index], newPipeline[index + 1]] = [newPipeline[index + 1], newPipeline[index]];
    onChange(newPipeline);
    if (onSyncYaml) {
      onSyncYaml(newPipeline);
    }
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
    if (onSyncYaml) {
      onSyncYaml(newPipeline);
    }
  };

  // Update stage parameters
  const updateStageParams = (index, newParams) => {
    const newPipeline = [...value];
    const currentStage = newPipeline[index];
    const currentClass = Object.keys(currentStage)[0];
    newPipeline[index] = { [currentClass]: newParams };
    onChange(newPipeline);
    if (onSyncYaml) {
      onSyncYaml(newPipeline);
    }
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
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={addStage} icon={<PlusOutlined />}>
          {t("add_stage")}
        </Button>
      </Space>

      {value.map((stage, index) => {
        if (Array.isArray(stage)) {
            stage = {[stage[0]]: stage[1]}
        }
        const stageClass = Object.keys(stage)[0];
        const stageParams = Object.values(stage)[0] || {};
        const stageSchema = getStageSchema(stageClass);

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
                pipelineSchema={pipelineSchema}
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

export default PipelineVisual;
