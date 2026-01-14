import { Table } from 'antd'
import { useState } from 'react';

export default function HistoryPage() {

  const [histories, setHistories] = useState([])

  return (
    <>
      <Table
        dataSource={histories}
        rowKey="id"
      ></Table>
    </>
  );
}