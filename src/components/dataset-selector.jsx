import { apiClient } from '../api'
import { TreeSelect, Tag, Space } from 'antd'
import { useEffect, useState, useMemo } from 'react'
import { CheckOutlined } from '@ant-design/icons'
import { useTranslation } from "react-i18next";

export default function DatasetSelector({
  onChange,
  multiple,
  value,
  style,
  ...props
}) {
  const { t } = useTranslation();
  const [datasets, setDatasets] = useState([])
  
  async function fetchDatasets() {
    const data = await apiClient.datasets()
    setDatasets(data)
  }
  
  // Render selected values with tags
  const renderValue = (selectedKeys, selectedNodes) => {
    if (!selectedKeys || selectedKeys.length === 0) {
      return <span style={{ color: '#bfbfbf' }}>数据集</span>
    }
    
    if (multiple && selectedKeys.length > 3) {
      return (
        <Tag color="blue" style={{ margin: 0 }}>
          选择 {selectedKeys.length} 个数据集
        </Tag>
      )
    }
    
    if (multiple) {
      return (
        <Space size={4}>
          {selectedKeys.map((key, index) => {
            const node = selectedNodes?.[index]
            const title = node?.title || key
            return (
              <Tag key={key} color="blue" style={{ margin: 0 }}>
                {title}
              </Tag>
            )
          })}
        </Space>
      )
    }
    
    const node = selectedNodes?.[0]
    return node?.title || selectedKeys?.[0] || t("数据集")
  }

  return (
    <TreeSelect
      id="datasets"
      showSearch
      multiple={multiple}
      style={{
        width: '100%',
        minWidth: 200,
        ...style
      }}
      value={value}
      styles={{
        popup: { root: { maxHeight: 400, overflow: 'auto' } }
      }}
      placeholder={t("选择数据集")}
      allowClear
      maxTagCount="responsive"
      treeDefaultExpandAll
      treeData={datasets}
      onChange={onChange}
      onOpenChange={() => {
        if (!datasets?.length) fetchDatasets()
      }}
      {...props}
    />
  )
}