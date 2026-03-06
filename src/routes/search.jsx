import { Card, Row, Col, Button, Checkbox, Input, message, Pagination, Select, Space, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import DatasetSelector from "../components/dataset-selector";
import ParagraphItem from "../components/paragraph-item";
import RemoteFilterSelector from "../components/remote-filter-selector";

const { Text } = Typography;
const { Option } = Select;

const SearchFilterBar = ({ filters, updateFilter, executeSearch }) => {
  return (<Card size="small" style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 第一行：搜索核心区 - 突出主要操作 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
        <Input.Search
          placeholder="搜索海量数据..."
          allowClear
          enterButton={<strong>搜索</strong>}
          size="large"
          value={filters.q}
          onChange={(e) => updateFilter({ q: e.target.value })}
          onSearch={() => executeSearch(updateFilter({ page: 1 }), true)}
          style={{ maxWidth: 600, flex: 1 }}
        />
        <Checkbox
          checked={filters.embeddings}
          onChange={(e) => updateFilter({ embeddings: e.target.checked })}
        >
          <span style={{ color: '#666' }}>语义匹配</span>
        </Checkbox>
      </div>

      {/* 第二行：主要筛选区 - 使用 Row/Col 响应式布局 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={24}>
          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <FilterItem label="数据集" style={{ flex: 1, display: 'flex' }}>
              <DatasetSelector
                multiple
                value={filters.datasets}
                onChange={(v) => updateFilter({ datasets: v })}
                style={{ minWidth: 200 }} // 必须设置 100% 撑开 flex 容器
              />
            </FilterItem>

            <FilterItem label="文件源" style={{ flex: 1, display: 'flex' }}>
              <RemoteFilterSelector
                multiple
                filters={filters}
                column="sources"
                onChange={(v) => updateFilter({ sources: v })}
                value={filters.sources}
                style={{ minWidth: 200 }} // 必须设置 100% 撑开 flex 容器
                disabled={!filters.datasets?.length}
              />
            </FilterItem>
          </Space>
        </Col>
      </Row>

      {/* 第三行：次要筛选与排序 - 更加紧凑 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', background: '#fafafa', padding: '12px', borderRadius: 6 }}>
        <FilterItem label="大纲">
          <RemoteFilterSelector
            filters={filters}
            multiple
            column="outline"
            onChange={(v) => updateFilter({ outline: v })}
            value={filters.outline}
            style={{ width: 160 }}
          />
        </FilterItem>

        <FilterItem label="作者">
          <RemoteFilterSelector
            multiple
            filters={filters}
            column="author"
            onChange={(v) => updateFilter({ authors: v })}
            value={filters.authors}
            style={{ width: 140 }}
          />
        </FilterItem>

        <FilterItem label="排序方式">
          <Select
            value={filters.sort}
            onChange={(v) => updateFilter({ sort: v })}
            style={{ width: 120 }}
            disabled={filters.embeddings}
          >
            <Option value="">相关度</Option>
            <Option value="pdate">日期 (↑)</Option>
            <Option value="-pdate">日期 (↓)</Option>
            <Option value="outline">大纲</Option>
            <Option value="source_url">出处</Option>
          </Select>
        </FilterItem>

        <FilterItem label="结果分组">
          <Select
            value={filters.groupBy}
            onChange={(v) => updateFilter({ groupBy: v })}
            style={{ width: 110 }}
          >
            <Option value="">不分组</Option>
            <Option value="author">按作者</Option>
            <Option value="source_url">按来源</Option>
            <Option value="pdate">按日期</Option>
          </Select>
        </FilterItem>

        <FilterItem label="语言">
          <RemoteFilterSelector
            multiple
            filters={filters}
            column="lang"
            onChange={(v) => updateFilter({ lang: v })}
            value={filters.lang}
            style={{ width: 100 }}
          />
        </FilterItem>

        {/* 快捷操作 */}
        <Button
          type="link"
          size="small"
          onClick={() => resetFilters()}
          style={{ marginLeft: 'auto', color: '#999' }}
        >
          重置筛选
        </Button>
      </div>
    </div>
  </Card>
  );
};

/**
 * 辅助组件：统一标签和输入框的排布
 */
const FilterItem = ({ label, children }) => (
  <Space size={8}>
    <Text type="secondary" strong style={{ whiteSpace: 'nowrap' }}>
      {label}:
    </Text>
    {children}
  </Space>
);

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // UI/Filter State (What the user sees in the inputs)
  const [filters, setFilters] = useState({
    q: "",
    datasets: [],
    sources: [],
    embeddings: false,
    sort: "",
    groupBy: "",
    outline: [],
    authors: [],
    page: 1,
    pageSize: 20,
  });

  // Data/Result State (What came back from the server)
  const [isLoading, setIsLoading] = useState(false);
  const [dataContext, setDataContext] = useState({
    results: [], // The "chunk" of data currently held in memory
    total: 0, // Total count from DB
    offset: -1, // The starting point of the current memory chunk
    lastQuery: null, // Stringified version of filters used for the last fetch
  });

  // Helper: Update individual filter fields
  const updateFilter = (updates) => {
    let newFilters = {}
    setFilters((prev) => {
      newFilters = { ...prev, ...updates }
      return newFilters;
    });
    return newFilters
  };

  // Sync UI state with URL on mount
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const datasets = JSON.parse(searchParams.get("datasets") || "[]");
    const sources = JSON.parse(searchParams.get("sources") || "[]");
    const outline = JSON.parse(searchParams.get("outline") || "[]");
    const embeddings = JSON.parse(searchParams.get("embeddings") || "false");
    const sort = searchParams.get("sort") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = apiClient.localConfig.pageSize || 20;
    const groupBy = searchParams.get("group_by") || "";

    const initialFilters = {
      ...filters,
      q,
      datasets,
      sources,
      embeddings,
      sort,
      page,
      pageSize,
      groupBy,
      outline,
    };
    setFilters(initialFilters);

    if (q) {
      executeSearch(initialFilters, true);
    }
    document.title = "搜索";
  }, []);

  // Sync URL with Filters
  const syncParamsToUrl = (currentFilters) => {
    const params = { ...currentFilters };
    params.datasets = JSON.stringify(params.datasets || []);
    params.sources = JSON.stringify(params.sources || []);
    params.outline = JSON.stringify(params.outline || []);
    const url = new URL(window.location)
    url.search = new URLSearchParams(Object.entries(params))
    window.history.replaceState(null, '', url);
  };

  const executeSearch = async (targetFilters, forceRefresh = false) => {
    console.log('executeSearch:', targetFilters)

    const { page, pageSize } = targetFilters;
    const targetOffset = (page - 1) * pageSize;
    const fetchSize = pageSize * 5;

    // Build query params
    const queryParams = { ...targetFilters };
    delete queryParams.page;
    delete queryParams.pageSize;
    if (!queryParams.embeddings) delete queryParams.embeddings;

    // Check if we can use cached/pre-fetched data
    const currentQueryKey = JSON.stringify(queryParams);
    const isSameQuery = currentQueryKey === dataContext.lastQuery;
    const isInBuffer =
      targetOffset >= dataContext.offset &&
      targetOffset + pageSize <=
      dataContext.offset + dataContext.results.length;

    if (!forceRefresh && isSameQuery && isInBuffer) {
      // Just update the page in URL, no network request needed
      syncParamsToUrl(targetFilters);
      return;
    }

    // Otherwise, fetch a large chunk (5 pages worth)
    try {
      setIsLoading(true);
      const response = await apiClient.search({ limit: fetchSize, offset: targetOffset, ...queryParams });

      if (response) {
        // Secondary call for total count if not provided in first response
        let total = response.total;
        if (total === undefined || total < 0) {
          const totalData = await apiClient.search({
            q: targetFilters.embeddings ? "*" : targetFilters.q,
            ...targetFilters,
            total: true,
          });
          total = totalData.total;
        }

        setDataContext({
          results: response.results,
          total: total || response.results.length,
          offset: targetOffset,
          lastQuery: currentQueryKey,
        });

        syncParamsToUrl(targetFilters);
      }
    } catch (err) {
      message.error(err.message || "搜索失败");
    } finally {
      setIsLoading(false);
    }
  };

  // Compute the visible slice of results
  const visibleResults = useMemo(() => {
    const relativeOffset =
      (filters.page - 1) * filters.pageSize - dataContext.offset;
    if (relativeOffset < 0 || !dataContext.results.length) return [];
    console.log("use prefetched data", relativeOffset);

    return dataContext.results
      .slice(relativeOffset, relativeOffset + filters.pageSize)
      .map((ele) => {
        const source_url = ele.source_url || "";
        return {
          ...ele,
          href: source_url.match(/https?:\/\//)
            ? source_url
            : `/files/${source_url.replace(/^\//, "")}?page=${ele.source_page + 1}`,
          displayDate:
            ele.pdate?.toString().replace(/(-01){0,2}T.+$/, "") || "",
        };
      });
  }, [dataContext, filters]);

  const handlePageChange = async (page, pageSize) => {
    const newFilters = updateFilter({ page, pageSize });
    apiClient.localConfig.pageSize = pageSize;
    await executeSearch(newFilters);
    document.querySelector('.result-wrapper').scrollIntoView()
  };


  return (
    <div className="search-page-container">

      {/* Search Input Section */}
      <SearchFilterBar filters={filters} updateFilter={updateFilter} executeSearch={executeSearch} />

      {/* Results Section */}
      <Spin spinning={isLoading}>
        <div className="result-wrapper">
          {visibleResults.map((ele) => (
            <ParagraphItem key={ele.id} data={ele} />
          ))}

          {dataContext.total > 0 && (
            <div className="pagination">
              <Pagination
                current={filters.page}
                pageSize={filters.pageSize}
                total={dataContext.total}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(total) => `${total} 条记录`}
                pageSizeOptions={["20", "50", "100"]}
              />
            </div>
          )}
        </div>
      </Spin>
    </div>
  );
}

export default SearchPage;
