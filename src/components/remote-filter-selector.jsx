import { Select, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { apiClient } from '../api';
import { useTranslation } from "react-i18next";

const RemoteFilterSelector = ({ filters, column, multiple, ...props }) => {
const { t } = useTranslation();
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
			const filterItems = await apiClient.getColumnFilters(column, filters)
			setOptions(filterItems);
			setHasLoaded(true);
		} catch (error) {
			console.error(t("load_failed"), error);
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
			mode={multiple ? 'multiple' : ''}     
			placeholder={t("click_to_load_options")}
			onOpenChange={handleOpenChange}
			options={options}
			loading={loading} 
			notFoundContent={loading ? <Spin size="small" /> : null}
			allowClear
			popupMatchSelectWidth={false}
			{...props}
		/>
	);
};

export default RemoteFilterSelector