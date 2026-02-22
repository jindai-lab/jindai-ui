import { Card, Checkbox, Input, message, Pagination, Select, Space, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import DatasetSelector from "../components/dataset-selector";
import ParagraphItem from "../components/paragraph-item";
import RemoteFilterSelector from "../components/remote-filter-selector";

const { Text } = Typography;
const { Option } = Select;

const SearchFilterBar = ({filters, updateFilter, executeSearch}) => {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space orientation="vertical" size="middle" style={{ display: 'flex' }}>
        
        {/* 第一行：核心搜索栏 */}
        <Space size="large">
          <Input.Search
            placeholder="请输入搜索内容..."
            value={filters.q}
            onChange={(e) => updateFilter({ q: e.target.value })}
            onSearch={() => executeSearch(updateFilter({ page: 1 }), true)}
            enterButton="搜索"
            style={{ width: 400 }}
          />
          <Checkbox
            checked={filters.embeddings}
            onChange={(e) => updateFilter({ embeddings: e.target.checked })}
          >
            语义匹配
          </Checkbox>
        </Space>

        {/* 第二行：主要过滤器 */}
        <Space wrap size="middle">
          <FilterItem label="数据集">
            <DatasetSelector
              multiple
              value={filters.datasets}
              onChange={(v) => updateFilter({ datasets: v })}
              style={{ width: 500 }}
            />
          </FilterItem>

          <FilterItem label="文件源">
            <RemoteFilterSelector
              multiple
              filters={filters}
              column="sources"
              onChange={(v) => updateFilter({ sources: v })}
              value={filters.sources}
              style={{ width: 500 }}
              disabled={!filters.datasets?.length}
            />
          </FilterItem>
        </Space>

        <Space wrap size="middle">
          <FilterItem label="大纲">
            <RemoteFilterSelector
              filters={filters}
              column="outline"
              onChange={(v) => updateFilter({ outline: v })}
              value={filters.outline}
              style={{ width: 200 }}
            />
          </FilterItem>
        
          <FilterItem label="排序">
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

          <FilterItem label="分组">
            <Select
              value={filters.groupBy}
              onChange={(v) => updateFilter({ groupBy: v })}
              style={{ width: 120 }}
            >
              <Option value="">无</Option>
              <Option value="author">作者</Option>
              <Option value="source_url">来源</Option>
              <Option value="pdate">日期</Option>
            </Select>
          </FilterItem>

          <FilterItem label="作者">
            <RemoteFilterSelector
              filters={filters}
              column="author"
              onChange={(v) => updateFilter({ authors: v })}
              value={filters.authors}
              style={{ width: 120 }}
            />
          </FilterItem>

          <FilterItem label="语言">
            <RemoteFilterSelector
              filters={filters}
              column="lang"
              onChange={(v) => updateFilter({ lang: v })}
              value={filters.lang}
              style={{ width: 100 }}
            />
          </FilterItem>
        </Space>
      </Space>
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

  const handlePageChange = (page, pageSize) => {
    const newFilters = updateFilter({ page, pageSize });
    apiClient.localConfig.pageSize = pageSize;
    executeSearch(newFilters);
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
                showTotal={(total) => `共 ${total} 条数据`}
                pageSizeOptions={["10", "20", "50", "100"]}
              />
            </div>
          )}
        </div>
      </Spin>
    </div>
  );
}

export default SearchPage;
