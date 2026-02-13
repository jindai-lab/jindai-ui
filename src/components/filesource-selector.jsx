import { TreeSelect } from 'antd';
import { useState } from 'react';
import { apiClient } from '../api';

export default function FileSourceSelector({
  onChange,
  multiple,
  value,
}) {
  const [sourceFiles, setSourceFiles] = useState([])

  async function fetchFileSources(folderPath = '') {
    const data = await apiClient.fileSources(folderPath);
    setSourceFiles(prev => prev.concat(data.items.map(item => ({
      title: item.name,
      value: item.relative_path,
      isLeaf: !item.is_directory,
      id: item.relative_path,
      pId: folderPath || null,
    }))));
  }

  async function fetchSearch(value) {
    const data = await apiClient.fileSources('/', value)
    setSourceFiles(prev => prev.concat(data.items.map(item => ({
      title: item.name,
      value: item.relative_path,
      isLeaf: !item.is_directory,
      id: item.relative_path,
      pId: item.relative_path.split('/').slice(0, -1).join('/') || null,
    }))));
  }

  return (
    <TreeSelect
      style={{ width: '100%' }}
      value={value}
      styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
      multiple={multiple}
      treeDataSimpleMode
      placeholder="文件源"
      allowClear
      treeData={sourceFiles}
      onChange={onChange}
      onOpenChange={() => {
        if (!sourceFiles?.length) fetchFileSources()
      }}
      showSearch={{ onSearch (value) { return fetchSearch(value) } }}
      loadData={({id}) => { return fetchFileSources(id) }}
    />
  )
}