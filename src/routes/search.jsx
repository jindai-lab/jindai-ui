import { useEffect, useState } from 'react';
import { Pagination, Checkbox, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import DatasetSelector from '../components/dataset-selector';
import FileSourceSelector from '../components/filesource-selector';
import { apiClient as api } from '../api'

function SearchPage() {

  const [searchParams, setSearchParams] = useSearchParams();
  // 搜索信息和状态
  const [searchText, setSearchText] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [embeddingSearch, setEmbeddingSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 分页信息
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [prefetched, setPrefetched] = useState({
    results: [], offset: -pageSize
  });
  // 数据集和文件源列表
  const [datasetSelection, setDatasetSelection] = useState([]);
  const [sourceFileSelection, setSourceFileSelection] = useState([]);

  function showLoading(loading) {
    setIsLoading(loading)
    if (loading) message.loading('正在加载...', 0)
    else message.destroy()
  }

  function applySearchParams() {
    const q = searchParams.get('q') || '';
    const ds = JSON.parse(searchParams.get('datasets') || '[]');
    const fs = JSON.parse(searchParams.get('sources') || '[]');
    const eb = JSON.parse(searchParams.get('embeddingSearch') || 'false');
    if (q) setSearchText(q);
    if (ds.length > 0) setDatasetSelection(ds);
    if (fs.length > 0) setSourceFileSelection(fs);
    setEmbeddingSearch(eb);

    const page = +(searchParams.get('page') || '0');
    if (page > 0) {
      setCurrentPage(page);
      searchParagraphs((page - 1) * pageSize, q, ds, fs, eb);
    }
  }

  function syncSearchParams(newPage) {
    const params = {};
    if (searchText.trim()) params.q = searchText.trim();
    if (datasetSelection.length > 0) params.datasets = JSON.stringify(datasetSelection);
    if (sourceFileSelection.length > 0) params.sources = JSON.stringify(sourceFileSelection);
    if (newPage) params.page = newPage;
    params.embeddingSearch = embeddingSearch;
    setSearchParams(params);
  }

  async function searchParagraphs(offset = 0, query = searchText, ds = datasetSelection, fs = sourceFileSelection, eb = embeddingSearch) {
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
      showLoading(true);

      const data = await api.search(query, ds, fs, offset, pageSize * 5, {embeddings: eb || undefined});
      if (!data) return
      api.search(query, ds, fs, offset, pageSize * 5, {embeddings: eb || undefined, total: true}).then(({total}) => {
        setPrefetched(prev => {prev.total = total; return Object.assign({}, prev);})
        setSearchResult(prev => {prev.total = total; return Object.assign({}, prev);})
      });

      setPrefetched({
        results: data.results,
        offset, query,
        total: data.total,
        datasets: ds,
        sources: fs,
        embeddingSearch: eb,
      });
      setSearchResult({
        results: data.results.slice(0, pageSize),
        total: data.total < 0 ? data.results.length + offset : data.total
      });
    } catch (err) {
      message.error(err.message)
    } finally {
      // 无论成功/失败，结束加载状态
      showLoading(false);
    }

  }

  // 核心搜索函数：处理接口调用逻辑
  const handleSearch = async () => {
    // 输入校验
    if (!searchText.trim()) {
      message.error('请输入搜索内容');
      return;
    }

    // 重置状态
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
    localStorage.pageSize = newPageSize
  };

  useEffect(() => {
    setPageSize(+localStorage.pageSize || 20)
    applySearchParams();
    document.title = '搜索'
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
        <Checkbox id='semantic' checked={embeddingSearch} onChange={e => setEmbeddingSearch(e.target.checked)} />
        <label htmlFor="semantic">语义匹配</label>
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
        <DatasetSelector
          multiple={true}
          value={datasetSelection}
          onChange={setDatasetSelection}
        />
      </div><div className="filter-bar">
        <label htmlFor="sources">文件源</label>
        <FileSourceSelector
          value={sourceFileSelection}
          multiple={true}
          onChange={setSourceFileSelection}
        />
      </div>

      {/* 搜索结果展示区（分元数据和文本） */}
      {!isLoading && searchResult && (
        <div className="result-wrapper">
          {searchResult.results.map(ele => {
            ele.source_url = ele.source_url || ''
            ele.href = ele.source_url.match(/https?:\/\//) ?
              ele.source_url :
              `/files/${ele.source_url.replace(/^\//, '')}?page=${ele.source_page+1}`
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
                {ele.outline && (
                  <div className="metadata-item">
                    <span className="metadata-label">大纲</span>
                    <span className="metadata-value">{ele.outline || ''}</span>
                  </div>
                )}
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
                <div className="" style={{ display: 'none' }}>{ele.id}</div>
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

    </>
  );
}

export default SearchPage;