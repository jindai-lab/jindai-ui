import { TreeSelect, Tag, Space } from 'antd'
import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../api'
import { useTranslation } from "react-i18next";

export default function FileSourceSelector({
  onChange,
  multiple,
  value,
  style,
  ...props
}) {
  const { t } = useTranslation();
  const [sourceFiles, setSourceFiles] = useState([])

  async function fetchFileSources(folderPath = '') {
    const data = await apiClient.fileSources(folderPath)
    setSourceFiles(prev => prev.concat(data.items.map(item => ({
      title: item.name,
      value: item.relative_path,
      isLeaf: !item.is_directory,
      id: item.relative_path,
      pId: folderPath || null,
    }))))
  }

  async function fetchSearch(value) {
    const data = await apiClient.fileSources('/', value)
    setSourceFiles(prev => prev.concat(data.items.map(item => ({
      title: item.name,
      value: item.relative_path,
      isLeaf: !item.is_directory,
      id: item.relative_path,
      pId: item.relative_path.split('/').slice(0, -1).join('/') || null,
    }))))
  }

  // Render selected values with tags
  const renderValue = (selectedKeys, selectedNodes) => {
    if (!selectedKeys || selectedKeys.length === 0) {
      return <span style={{ color: '#bfbfbf' }}>文件源</span>
    }
    
    if (multiple && selectedKeys.length > 3) {
      return (
        <Tag color="blue" style={{ margin: 0 }}>
          选择 {selectedKeys.length} 个文件
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
    return node?.title || selectedKeys?.[0] || t("文件源")
  }

  return (
    <TreeSelect
      id="fileSources"
      showSearch={{ onSearch: (value) => fetchSearch(value) }}
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
      placeholder={t("选择文件源")}
      allowClear
      maxTagCount="responsive"
      treeData={sourceFiles}
      onChange={onChange}
      onOpenChange={() => {
        if (!sourceFiles?.length) fetchFileSources()
      }}
      loadData={({id}) => fetchFileSources(id)}
      {...props}
    />
  )
}
