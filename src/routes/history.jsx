import { Table } from 'antd'
import { useEffect, useState } from 'react';
import { apiClient } from "../api.js"

export default function HistoryPage() {

  const [histories, setHistories] = useState([])

  useEffect(() => {
    apiClient.histories().then(data => setHistories(data.results))
    return () => {}
  }, [])

  return (
    <>
      <Table
        dataSource={histories}
        rowKey="id"
      ></Table>
    </>
  );
}