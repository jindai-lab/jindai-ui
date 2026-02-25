import { Table } from 'antd'
import { useEffect, useState } from 'react';
import { apiClient } from "../api.js"
import dayjs from 'dayjs';

export default function HistoryPage() {

  const [histories, setHistories] = useState([])

  useEffect(() => {
    apiClient.histories().then(data => setHistories(data?.results))
    return () => {}
  }, [])

  return (
    <>
      <Table
        dataSource={histories}
        rowKey="id"
        columns={[
          {
            title: '日期',
            dataIndex: 'created_at',
            render (v) {
              return dayjs(v).format('YYYY-MM-DD HH:mm:ss');
            }
          },
          // {
          //   title: '用户',
          //   dataIndex: 'user_id',
          // },
          {
            title: '查询',
            dataIndex: 'queries',
            render(v) {
              return (<pre className='json'>{JSON.stringify(v, null, 2)}</pre>)
            }
          },
        ]}
      ></Table>
    </>
  );
}