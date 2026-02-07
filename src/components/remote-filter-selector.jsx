import React, { useEffect, useState } from 'react';
import { Select, Spin } from 'antd';
import { apiClient } from '../api';

const RemoteFilterSelector = ({filters, column, value, onChange}) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        setHasLoaded(false)
        setOptions([])
    }, [filters, column])

    const fetchApiData = async () => {
        setLoading(true);
        try {
            const response = await apiClient.callAPI(`paragraphs/filters/${column}`, filters)
            setOptions(response.map(({value, count}) => ({ label: `${value} (${count})`, value })));
            setHasLoaded(true); // 标记已加载，防止重复请求
        } catch (error) {
            console.error("加载失败", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open) => {
        // 只有在展开下拉框 且 之前没加载过数据时 才发起请求
        if (open && !hasLoaded) {
            fetchApiData();
        }
    };

    return (
        <Select
            mode="multiple"           // 开启多选模式
            style={{ width: '100%' }}
            placeholder="点击加载选项"
            onOpenChange={handleOpenChange}
            options={options}
            loading={loading}         // 显示加载状态（小菊花）
            notFoundContent={loading ? <Spin size="small" /> : null}
            allowClear
            onChange={onChange}
            value={value}
        />
    );
};

export default RemoteFilterSelector