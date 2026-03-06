import { Card, Row, Col, Button, Checkbox, Input, message, Pagination, Select, Space, Spin, Typography, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import DatasetSelector from "../components/dataset-selector";
import FileSourceSelector from "../components/filesource-selector";
import ParagraphItem from "../components/paragraph-item";
import RemoteFilterSelector from "../components/remote-filter-selector";
import { ClearOutlined, SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { Option } = Select;

const SearchFilterBar = ({ filters, updateFilter, executeSearch }) => {
  const handleReset = () => {
    updateFilter({
      q: "",
      datasets: [],
      sources: [],
      embeddings: false,
      sort: "",
      groupBy: "",
      outline: [],
      authors: [],
      page: 1,
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.q?.trim()) count++;
    if (filters.datasets?.length) count++;
    if (filters.sources?.length) count++;
    if (filters.outline?.length) count++;
    if (filters.authors?.length) count++;
    if (filters.lang?.length) count++;
    if (filters.sort) count++;
    if (filters.groupBy) count++;
    if (filters.embeddings) count++;
    return count;
  }, [filters]);

  return (
    <Card
      size="small"
      style={{
        marginBottom: 24,
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 第一行：搜索核心区 - 突出主要操作 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          paddingBottom: 20,
          position: 'relative'
        }}>
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <Input.Search
              placeholder="搜索海量数据..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={filters.q}
              onChange={(e) => updateFilter({ q: e.target.value })}
              onSearch={() => executeSearch(updateFilter({ page: 1 }), true)}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            />
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 0'
          }}>
            <Checkbox
              checked={filters.embeddings}
              onChange={(e) => updateFilter({ embeddings: e.target.checked })}
              style={{
                fontSize: 14,
                color: filters.embeddings ? 'var(--primary)' : '#666'
              }}
            >
              <span style={{ color: filters.embeddings ? 'var(--primary)' : '#666', fontWeight: filters.embeddings ? 500 : 400 }}>
                语义匹配
              </span>
            </Checkbox>
          </div>
        </div>

        {/* 第二行：主要筛选区 - 使用 Row/Col 响应式布局 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <FilterItem label="数据集">
              <DatasetSelector
                multiple
                value={filters.datasets}
                onChange={(v) => updateFilter({ datasets: v })}
                style={{ width: '100%' }}
              />
            </FilterItem>
          </Col>
          <Col xs={24} lg={12}>
            <FilterItem label="文件源">
              <FileSourceSelector
                multiple
                value={filters.sources}
                onChange={(v) => updateFilter({ sources: v })}
                style={{ width: '100%' }}
              />
            </FilterItem>
          </Col>
        </Row>

        {/* 第三行：次要筛选与排序 - 更加紧凑 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-start',
          background: '#fafafa',
          padding: '16px 20px',
          borderRadius: 8,
          border: '1px solid #f0f0f0'
        }}>
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

          <FilterItem label="排序">
            <Select
              value={filters.sort}
              onChange={(v) => updateFilter({ sort: v })}
              style={{ width: 130 }}
              disabled={filters.embeddings}
              placeholder="相关度"
            >
              <Option value="">相关度</Option>
              <Option value="pdate">日期 ↑</Option>
              <Option value="-pdate">日期 ↓</Option>
              <Option value="outline">大纲</Option>
              <Option value="source_url">出处</Option>
            </Select>
          </FilterItem>

          <FilterItem label="分组">
            <Select
              value={filters.groupBy}
              onChange={(v) => updateFilter({ groupBy: v })}
              style={{ width: 120 }}
              placeholder="不分组"
            >
              <Option value="">不分组</Option>
              <Option value="author">作者</Option>
              <Option value="source_url">来源</Option>
              <Option value="pdate">日期</Option>
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
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {activeFiltersCount > 0 && (
              <Tag color="var(--primary)" style={{ margin: 0, padding: '2px 8px' }}>
                {activeFiltersCount} 个筛选
              </Tag>
            )}
            <Button
              type="text"
              size="small"
              onClick={handleReset}
              icon={<ClearOutlined style={{ fontSize: 12 }} />}
              style={{ color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              重置
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * 辅助组件：统一标签和输入框的排布
 */
const FilterItem = ({ label, children }) => (
  <Space size={8} style={{ flexWrap: 'wrap' }}>
    <Text type="secondary" strong style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
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
      <SearchFilterBar
       style={{background: 'var(--bg)', color: 'var(--text)'}}
       filters={filters} updateFilter={updateFilter} executeSearch={executeSearch} />

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
