import { Table } from 'antd'
import { useEffect, useState } from 'react';
import { apiClient } from "../api.js"
import dayjs from 'dayjs';
import { useTranslation } from "react-i18next";

export default function HistoryPage() {
const { t } = useTranslation();

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
            title: t("日期"),
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
            title: t("查询"),
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