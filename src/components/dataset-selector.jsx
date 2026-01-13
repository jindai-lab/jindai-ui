import { apiClient as api } from '../api'
import { TreeSelect } from 'antd'
import { useEffect, useState } from 'react'

export default function DatasetSelector({
  onChange,
  multiple,
  value
}) {
  const [datasets, setDatasets] = useState([])
  
  async function fetchDatasets() {
    const data = await api.datasets()
    setDatasets(data)
  }
  
  return (
    <TreeSelect
      id="datasets"
      showSearch
      style={{ width: '100%' }}
      value={value}
      styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
      multiple={multiple}
      placeholder="数据集"
      allowClear
      onOpenChange={() => {
        if (!datasets?.length) fetchDatasets()
      }}
      treeData={datasets}
      onChange={onChange}
    />
  )
}