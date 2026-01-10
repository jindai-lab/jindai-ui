import { useEffect, useState } from "react";
import {useApiClient} from '../api'
import { Button, message, Select } from "antd";
import DatasetSelector from "../components/dataset-selector";
import FileSourceSelector from "../components/filesource-selector";
import { useSearchParams } from "react-router-dom";

export default function ImportPage() {

  const [dataset, setDatasetSelection] = useState('')
  const [source, setFileSourcesSelection] = useState('')
  const [lang, setLang] = useState('zhs')
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('source')) setFileSourcesSelection(searchParams.get('source'))
    if (searchParams.get('dataset')) setDatasetSelection(searchParams.get('dataset'))
  }, [])

  async function startImport() {
    api.newJob({type: 'import', dataset, source, lang})
  }

  return (
    <>
      <h2>导入数据集</h2>
      <label htmlFor="datasets" id="datasets">数据集</label>
      <DatasetSelector onChange={setDatasetSelection} value={dataset} />
      <label htmlFor="sources">文件源</label>
      <FileSourceSelector id="sources" onChange={setFileSourcesSelection} value={source} />
      <label htmlFor="lang">语言</label>
      <Select id="lang"
        showSearch
        style={{width: 120}}
        value={lang} options={api.localeCodes} onChange={setLang}>语言</Select>
      <Button onClick={startImport}>开始</Button>
    </>
  )

}