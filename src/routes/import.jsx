import { useEffect, useState } from "react";
import { apiClient } from '../api'
import { Button, message, Select } from "antd";
import DatasetSelector from "../components/dataset-selector";
import FileSourceSelector from "../components/filesource-selector";
import { useSearchParams } from "react-router-dom";

export default function ImportPage() {

  const [dataset, setDataset] = useState('')
  const [source, setFileSource] = useState('')
  const [lang, setLang] = useState('zhs')
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('source')) setFileSource(searchParams.get('source'))
    if (searchParams.get('dataset')) setDataset(searchParams.get('dataset'))
  }, [])

  async function startImport() {
    apiClient.newJob({type: 'import', dataset, source, lang})
  }

  return (
    <>
      <h2>导入数据集</h2>
      <label htmlFor="datasets" id="datasets">数据集</label>
      <DatasetSelector onChange={setDataset} value={dataset} />
      <label htmlFor="sources">文件源</label>
      <FileSourceSelector id="sources" onChange={setFileSource} value={source} />
      <label htmlFor="lang">语言</label>
      <Select id="lang"
        showSearch
        style={{width: 120}}
        value={lang} options={apiClient.localeCodes} onChange={setLang}>语言</Select>
      <Button onClick={startImport}>开始</Button>
    </>
  )

}