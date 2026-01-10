import {useApiClient} from '../api'
import { TreeSelect } from 'antd'
import { useEffect, useState } from 'react'

export default function FileSourceSelector({
  onChange,
  multiple,
  value
}) {
  const api = useApiClient()
  const [sourceFiles, setSourceFiles] = useState([])
  
  async function fetchFileSources(folderPath = '') {
    const data = await api.fileSources(folderPath);
    setSourceFiles(sourceFiles.concat(data.items.map(item => ({
      title: item.name,
      value: '/' + item.relative_path,
      isLeaf: !item.is_directory,
      id: '/' + item.relative_path,
      pId: folderPath || null,
    }))));
  }

  useEffect(() => {
    fetchFileSources()
  }, [])

  return (
    <TreeSelect
      showSearch
      style={{ width: '100%' }}
      value={value}
      styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
      multiple={multiple}
      treeDataSimpleMode
      placeholder="文件源"
      allowClear
      treeData={sourceFiles}
      onChange={onChange}
      loadData={({ id }) => {
        return fetchFileSources(id)
      }}
    />
  )
}