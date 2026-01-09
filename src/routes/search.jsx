import { useEffect, useState } from 'react';
import { TreeSelect, Pagination } from 'antd';
import { useSearchParams } from 'react-router-dom';

function SearchPage() {

  const [searchParams, setSearchParams] = useSearchParams();
  // 搜索信息和状态
  const [searchText, setSearchText] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // 分页信息
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [prefetched, setPrefetched] = useState({
    results: [], offset: -pageSize
  });
  // 数据集和文件源列表
  const [datasets, setDatasets] = useState([]);
  const [datasetSelection, setDatasetSelection] = useState([]);
  const [sources, setSources] = useState([]);
  const [sourceFileSelection, setSourceFileSelection] = useState([]);

  function applySearchParams() {
    const q = searchParams.get('q') || '';
    const ds = JSON.parse(searchParams.get('datasets') || '[]');
    const fs = JSON.parse(searchParams.get('sources') || '[]');
    if (q) setSearchText(q);
    if (ds.length > 0) setDatasetSelection(ds);
    if (fs.length > 0) setSourceFileSelection(fs);

    const page = +(searchParams.get('page') || '0');
    if (page > 0) {
      setCurrentPage(page);
      searchParagraphs((page - 1) * pageSize, q, ds, fs);
    }
  }

  function syncSearchParams(newPage) {
    const params = {};
    if (searchText.trim()) params.q = searchText.trim();
    if (datasetSelection.length > 0) params.datasets = JSON.stringify(datasetSelection);
    if (sourceFileSelection.length > 0) params.sources = JSON.stringify(sourceFileSelection);
    if (newPage) params.page = newPage;
    setSearchParams(params);
  }

  async function searchParagraphs(offset=0, query=searchText, ds=datasetSelection, fs=sourceFileSelection) {
    try {
      if (searchText)
        syncSearchParams(offset / pageSize + 1);

      if (query == prefetched.query && ds == prefetched.datasets && fs == prefetched.sources &&
         prefetched.offset <= offset && prefetched.offset + prefetched.results.length > offset) {
        // 使用预取数据
        const start = offset - prefetched.offset;
        const end = start + pageSize;
        setSearchResult({
          results: prefetched.results.slice(start, end),
          total: prefetched.total
        });
        console.log('使用预取数据', start, end, prefetched.offset);
        return;
      }

      console.log('发送新请求', offset);

      setSearchResult({ results: [], total: 0 }); // 清空旧结果
      setIsLoading(true);

      const response = await fetch(`/api/paragraphs?offset=${offset}&limit=${pageSize * 5}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // 必须指定 JSON 格式
        },
        body: JSON.stringify({ search: query.trim(), datasets: ds, sources: fs }), // 构造请求体
      });
      // 校验响应状态
      if (!response.ok) {
        throw new Error(`请求失败：${response.status} ${response.statusText}`);
      }

      // 解析响应结果
      const data = await response.json();
      setPrefetched({
        results: data.results,
        offset: offset,
        total: data.total,
        query: query,
        datasets: ds,
        sources: fs,
      });
      setSearchResult({
        results: data.results.slice(0, pageSize),
        total: data.total
      });
      setIsLoading(false)
    } catch (err) {
      // 捕获所有错误并展示
      setError(err.message);
    } finally {
      // 无论成功/失败，结束加载状态
      setIsLoading(false);
    }

  }

  if (datasets.length === 0) {
    fetch('/api/datasets')
      .then(response => response.json())
      .then(data => setDatasets(data.results));
  }

  // 核心搜索函数：处理接口调用逻辑
  const handleSearch = async () => {
    // 输入校验
    if (!searchText.trim()) {
      setError('请输入搜索内容');
      return;
    }

    // 重置状态
    setIsLoading(true);
    setError('');
    setSearchResult(null);

    setCurrentPage(1);

    // 发送 POST 请求
    setPrefetched({ results: [], offset: -pageSize });
    searchParagraphs(); // 存储结果供展示

  };

  // 处理回车触发搜索
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage, newPageSize) => {
    setCurrentPage(newPage);
    setPageSize(newPageSize);
    searchParagraphs(newPageSize * (newPage - 1));
  };

  async function fetchSources(folderPath = '') {
    const response = await fetch('/api/files' + folderPath);
    const data = await response.json();
    setSources(sources.concat(data.items.map(item => ({
      title: item.name,
      value: '/' + item.relative_path,
      isLeaf: !item.is_directory,
      id: '/' + item.relative_path,
      pId: folderPath || null,
    }))));
  }

  useEffect(() => {
    fetchSources();
    applySearchParams();
  }, [])

  return (
    <>
      {/* 搜索栏 */}
      <div className="search-bar">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyUp={handleKeyPress}
          placeholder="请输入搜索内容..."
          disabled={isLoading}
          className="search-input"
          style={{ clear: 'both' }}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="search-button"
        >
          搜索
        </button>
      </div>
      <div className="filter-bar">
        <label htmlFor="datasets">数据集</label>
        <TreeSelect
          id="datasets"
          showSearch
          style={{ width: '100%' }}
          value={datasetSelection}
          styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
          multiple
          placeholder="数据集"
          allowClear
          treeData={datasets}
          onChange={e => {
            setDatasetSelection(e)
          }}
        />
        </div><div className="filter-bar">
        <label htmlFor="sources">文件源</label>
        <TreeSelect
          id="sources"
          showSearch
          style={{ width: '100%' }}
          value={sourceFileSelection}
          styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
          multiple treeDataSimpleMode
          placeholder="文件源"
          allowClear
          treeData={sources}
          onChange={e => {
            setSourceFileSelection(e)
          }}
          loadData={({ id }) => {
            return fetchSources(id)
          }}
        ></TreeSelect>
      </div>

      {/* 错误提示 */}
      {error && <div className="error-alert">{error}</div>}

      {/* 加载提示 */}
      {isLoading && <div className="loading-hint">正在搜索，请稍候...</div>}

      {/* 搜索结果展示区（分元数据和文本） */}
      {!isLoading && searchResult && (
        <div className="result-wrapper">
          <h3 className="result-title">搜索结果</h3>
          {searchResult.results.map(ele => {
            ele.href = ele.source_url.match(/https?:\/\//) ?
              ele.source_url :
              `/files/${ele.source_url.replace(/^\//, '')}?page=${ele.source_page}`
            ele.pdate = ele.pdate?.toString().split('T')[0] || ''
            if (ele.pdate.endsWith('-01')) ele.pdate = ele.pdate.substring(0, ele.pdate.length - 3)
            if (ele.pdate.endsWith('-01')) ele.pdate = ele.pdate.substring(0, ele.pdate.length - 3)

            return ele
          }).map((ele) => (
            <div className="result" key={ele.id}>
              <div className="metadata-section">
                <div className="metadata-item">
                  <span className="metadata-label">数据集</span>
                  <span className="metadata-value">{ele.dataset || ''}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">出处</span>
                  <span className="metadata-value">
                    <a href={ele.href} target='_blank'>{ele.source_url || ''}
                      {ele.pagenum ? `:${ele.pagenum}` : ''}</a>
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">大纲</span>
                  <span className="metadata-value">{ele.outline || ''}</span>
                </div>
                {ele.author && (
                  <div className="metadata-item">
                    <span className="metadata-label">作者</span>
                    <span className="metadata-value">{ele.author}</span>
                  </div>
                )}
                {ele.pdate && (
                  <div className="metadata-item">
                    <span className="metadata-label">日期</span>
                    <span className="metadata-value">{ele.pdate}</span>
                  </div>
                )}
              </div>
              <div className="text-content">
                {ele.content || '无文本内容'}
              </div>
            </div>
          ))}
          <div className="pagination">
            <Pagination
              // 核心属性
              current={currentPage} // 当前页码
              pageSize={pageSize}   // 每页显示条数
              total={searchResult.total}         // 总数据条数（必传）
              // 回调函数
              onChange={handlePageChange} // 页码/每页条数改变时触发
              // 可选配置
              showSizeChanger // 显示“每页条数”下拉框
              showQuickJumper // 显示快速跳页输入框
              showTotal={(total) => `共 ${total} 条数据`} // 显示总条数文案
              pageSizeOptions={['10', '20', '50', '100']} // 每页条数可选值
              size="middle" // 分页组件尺寸：small | middle | large
            />
          </div>

        </div>
      )}

      {/* 无结果提示 */}
      {searchResult?.total === 0 && !error && !isLoading && searchText.trim() && (
        <div className="empty-result">暂无搜索结果，请输入关键词重试</div>
      )}
    </>
  );
}

export default SearchPage;