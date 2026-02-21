import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Pagination, Checkbox, Select, message, Spin } from "antd";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import DatasetSelector from "../components/dataset-selector";
import FileSourceSelector from "../components/filesource-selector";
import ParagraphItem from "../components/paragraph-item";
import RemoteFilterSelector from "../components/remote-filter-selector";

const { Option } = Select;

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
      <div className="search-bar">
        <input
          className="search-input"
          value={filters.q}
          onChange={(e) => updateFilter({ q: e.target.value })}
          onKeyUp={(e) =>
            e.key === "Enter" && executeSearch(updateFilter({ page: 1 }), true)
          }
          placeholder="请输入搜索内容..."
        />
        <Checkbox
          id="semantic"
          checked={filters.embeddings}
          onChange={(e) => updateFilter({ embeddings: e.target.checked })}
        />
        <label htmlFor="semantic">语义匹配</label>
        <button
          className="search-button"
          onClick={() => {
            executeSearch(updateFilter({ page: 1 }), true);
          }}
        >
          搜索
        </button>
      </div>

      {/* Selectors Section */}
      <div className="filter-group">
        <div className="filter-bar">
          <label>数据集</label>
          <DatasetSelector
            multiple
            value={filters.datasets}
            onChange={(v) => updateFilter({ datasets: v })}
          />
        </div>
        <div className="filter-bar">
          <label>文件源</label>
          <FileSourceSelector
            multiple
            value={filters.sources}
            onChange={(v) => updateFilter({ sources: v })}
          />
        </div>
        <div className="filter-bar">
          <label>排序</label>
          <Select
            value={filters.sort}
            onChange={(v) => updateFilter({ sort: v })}
            style={{ width: 120 }}
          >
            <Option value="">相关度</Option>
            <Option value="pdate">日期 (↑)</Option>
            <Option value="-pdate">日期 (↓)</Option>
            <Option value="outline">大纲</Option>
            <Option value="source_url">出处</Option>
          </Select>
          <label>分组</label>
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
          <label>大纲</label>
          <RemoteFilterSelector
            filters={filters}
            column="outline"
            onChange={(v) => updateFilter({ outline: v })}
            value={filters.outline}
            style={{ width: 240 }}
          />

          <label>作者</label>
          <RemoteFilterSelector
            filters={filters}
            column="author"
            onChange={(v) => updateFilter({ authors: v })}
            value={filters.authors}
            style={{ width: 120 }}
          />
        </div>
      </div>

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
