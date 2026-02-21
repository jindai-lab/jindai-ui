import React from 'react';
import { Form, Input, InputNumber, Switch, Card, Button, Space, Divider, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import DatasetSelector from './dataset-selector'
import FileSourceSelector from './filesource-selector'

const ParamPanel = ({ scheme, value = {}, onChange }) => {

  // 统一变更处理函数
  const handleFieldChange = (key, val) => {
    onChange({
      ...value,
      [key]: val,
    });
  };

  const renderField = (key, type, currentVal) => {
    if (key === 'type') return;

    // 基础类型映射
    const components = {
      int: (
        <InputNumber
          style={{ width: '100%' }} precision={0} placeholder="Integer"
          value={currentVal} onChange={(v) => handleFieldChange(key, v)}
        />
      ),
      float: (
        <InputNumber
          style={{ width: '100%' }} placeholder="Float"
          value={currentVal} onChange={(v) => handleFieldChange(key, v)}
        />
      ),
      bool: (
        <Select
          options={[
            { value: "", label: '不指定' },
            { value: true, label: '是' },
            { value: false, label: '否' },
          ]}
          value={currentVal}
          onChange={(v) => handleFieldChange(key, v)}
        />
      ),
      str: (
        <Input
          value={currentVal} onChange={(e) => handleFieldChange(key, e.target.value)}
        />
      ),
      dataset: (
        <DatasetSelector value={currentVal} onChange={(e) => handleFieldChange(key, e)} />
      ),
      folder: (
        <FileSourceSelector value={currentVal} onChange={(e) => handleFieldChange(key, e)} />
      ),
      datasets: (
        <DatasetSelector multiple value={currentVal} onChange={(e) => handleFieldChange(key, e)} />
      ),
      sources: (
        <FileSourceSelector multiple value={currentVal} onChange={(e) => handleFieldChange(key, e)} />
      ),
      groupBy: (
        <Select multiple value={currentVal} onChange={(e) => handleFieldChange(key, e)} options={[
          { value: 'pdate', label: "日期" },
          { value: 'author', label: '作者' },
          { value: 'source_url', label: '来源' },
          { value: 'outline', label: '大纲' }
        ]} />
      ),
      sort: (
        <Select multiple value={currentVal} onChange={(e) => handleFieldChange(key, e)} options={[
          { value: 'pdate', label: "日期（↑）" },
          { value: '-pdate', label: "日期（↓）" },
          { value: 'author', label: '作者' },
          { value: 'source_url', label: '来源' },
          { value: 'outline', label: '大纲' }
        ]} />
      ),
    };

    if (!components[key]) {

      // 处理 List 类型 (动态数组)
      if (type === 'list' || (typeof type === 'object' && type.isArray)) {
        const subType = typeof type === 'object' ? type.itemType : 'str';
        const listData = Array.isArray(currentVal) ? currentVal : [];

        const addItem = () => handleFieldChange(key, [...listData, undefined]);
        const removeItem = (index) => {
          const newList = [...listData];
          newList.splice(index, 1);
          handleFieldChange(key, newList);
        };
        const updateItem = (index, val) => {
          const newList = [...listData];
          newList[index] = val;
          handleFieldChange(key, newList);
        };

        return (
          <Card key={key} size="small" title={`${key} (List)`} style={{ marginBottom: 16, borderLeftColor: 'var(--primary)' }}>
            {listData.map((item, index) => (
              <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                {/* 递归调用自身来渲染数组内的每一个元素 */}
                <ParamPanel
                  scheme={{ [`Item ${index}`]: subType }}
                  value={{ [`Item ${index}`]: item }}
                  onChange={(newVal) => updateItem(index, newVal[`Item ${index}`])}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeItem(index)}
                />
              </Space>
            ))}
            <Button type="dashed" onClick={addItem} block icon={<PlusOutlined />}>
              Add Item
            </Button>
          </Card>
        );
      }

      // 处理 Dict 类型 (递归)
      if (type === 'dict' || (typeof type === 'object' && !type.isArray)) {
        const subScheme = typeof type === 'object' ? type : {};
        return (
          <Card key={key} title={key} size="small" style={{ marginBottom: 16, borderLeft: '4px solid var(--primary)' }}>
            <ParamPanel
              scheme={subScheme}
              value={currentVal || {}}
              onChange={(newVal) => handleFieldChange(key, newVal)}
            />
          </Card>
        );
      }

      if (typeof type === 'object' && type.options) {
        return (<Select multiple value={currentVal} onChange={(e) => handleFieldChange(key, e)} options={type.options.map(x => ({label: x, value: x}))} />)
      }

    }

    return (
      <Form.Item key={key} label={key} valuePropName="value">
        {components[key] || components[type] || components['str']}
      </Form.Item>
    );
  };

  return (
    <>
      {Object.keys(scheme).map((key) => renderField(key, scheme[key], value[key]))}
    </>
  );
};

export default ParamPanel;