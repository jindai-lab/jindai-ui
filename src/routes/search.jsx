import { Spin, message, Pagination } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";
import ParagraphItem from "../components/paragraph-item";
import { SearchFilterBar } from "../components/search-widgets";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

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
    document.title = t("search");
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
      message.error(err.message || t("search_failed"));
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
