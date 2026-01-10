import {useApiClient} from '../api'
import { TreeSelect } from 'antd'
import { useEffect, useState } from 'react'

export default function DatasetSelector({ 
  onChange,
  multiple,
  value
 }) {
  const [datasets, setDatasets] = useState([])
const api = useApiClient()
  useEffect(() => {
    api.datasets().then(setDatasets)
  }, [])

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
      treeData={datasets}
      onChange={onChange}
    />
  )
}