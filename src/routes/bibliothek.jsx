import { CodeOutlined, CopyOutlined, DashboardOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, FileTextOutlined, PlusOutlined, SearchOutlined, SyncOutlined, UnorderedListOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Divider, Dropdown, Form, Grid, Input, message, Modal, Pagination, Select, Space, Table, Tag, Typography, Upload } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import { openAuthorSearch } from "../author-search";
import { BibItemCover, BibItemDetailContent } from "../components/bib-item-detail-content";
import BibItemDisplay from "../components/bib-item-display";
import BibItemEditForm from "../components/bib-item-edit-form";
import AuthorsSelect from "../components/authors-select";
import { formatItemType, getItemTypeOptions } from "../components/item-types";

const { useBreakpoint } = Grid;

export default function BibliothekPage() {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bibItems, setBibItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('bibitems_view_mode');
    return saved || 'list';
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showBibtexModal, setShowBibtexModal] = useState(false);
  const [bibtexText, setBibtexText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pathPreview, setPathPreview] = useState('');
  const [uploadForm] = Form.useForm();
  const fileInputRef = useRef(null);
  const [dragPdfOver, setDragPdfOver] = useState(false);
  const dragCounterRef = useRef(0);
  const navigate = useNavigate();

  // Search input state. It is initialized from (and kept in sync with) the
  // URL params: the URL-driven effect below calls handleSearch, which
  // canonicalizes these fields against the params it searches by.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [itemType, setItemType] = useState('book');

  // Update URL params when search changes
  const updateSearchParams = (query, type, page = 1, force = true, itemTypeValue = itemType, limitValue = pageSize) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (type && type !== 'all') params.set('type', type);
    if (itemTypeValue && itemTypeValue !== 'book') params.set('item_type', itemTypeValue);
    if (page > 1) params.set('page', page);
    if (limitValue && limitValue !== 20) params.set('limit', limitValue);
    if (force) params.set('t', new Date().getTime())
    setSearchParams(params);
  };

  useEffect(() => {
    localStorage.setItem('bibitems_view_mode', viewMode);
  }, [viewMode]);

  // Preview the normalized <upload base dir>/<first author>/ storage path as
  // authors are typed (base dir comes from the plugin config, default "OneDrive/")
  const watchedAuthors = Form.useWatch('authors', uploadForm);
  useEffect(() => {
    // Debounce the whole preview refresh (including clearing it once all
    // authors are removed) so the effect body never calls setState
    // synchronously.
    const timer = setTimeout(async () => {
      const list = (watchedAuthors || []).filter((a) => a && String(a).trim());
      if (!list.length) {
        setPathPreview('');
        return;
      }
      try {
        const resp = await apiClient.makeCall('bibliography/authors/normalize', { authors: list });
        if (resp?.success) setPathPreview(`${resp.root || 'OneDrive'}/${resp.directory}/`);
      } catch {
        // preview only, ignore errors
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [watchedAuthors]);

  // Pre-fill the title from the file name (dropping a trailing "_cropped"
  // suffix) so the user can review and edit it before uploading.
  const watchedFile = Form.useWatch('file', uploadForm);
  useEffect(() => {
    const name = watchedFile?.[0]?.originFileObj?.name || watchedFile?.[0]?.name || '';
    if (!name.toLowerCase().endsWith('.pdf')) return;
    const stem = name.replace(/\.pdf$/i, '');
    const autoTitle = stem.replace(/(?:[_\s]cropped)+$/i, '').trim();
    uploadForm.setFieldsValue({ title: autoTitle || stem.trim() });
  }, [watchedFile, uploadForm]);

  const handleSearch = async (query = '', type = '', page = 1, limit = 20, itemTypeFilter = itemType) => {
    // Canonicalize the search inputs with the params actually being
    // searched: this keeps the boxes in sync with the URL on the initial
    // mount and on browser back/forward navigation (the URL-driven effect
    // below is our only caller and always passes explicit params).
    const effectiveQuery = query || searchQuery;
    const effectiveType = type || searchType;
    setSearchQuery(effectiveQuery);
    setSearchType(['tag', 'title', 'author', 'all'].includes(effectiveType) ? effectiveType : 'all');
    setItemType(itemTypeFilter);
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const data = await apiClient.makeCall(`bibliography/search`, {
        query: effectiveQuery,
        type: effectiveType,
        item_type: itemTypeFilter,
        limit, offset
      }, { method: "GET" });
      setBibItems(data.results?.map(item => {
        if (item.date) {
          item.date = dayjs(item.date).format('YYYY-MM-DD')
          if (item.date.startsWith('0101-')) item.date = ''
        }
        return item;
      }) ?? []);
      setTotalCount(data.count ?? 0);
      setCurrentPage(page);
      setPageSize(limit);
    } catch (e) {
      message.error(t("Failed to load bibliography items") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  // Keep a ref to the latest handleSearch so the URL-driven effect below can
  // call it without re-subscribing on every render (handleSearch's identity
  // changes each render, which would otherwise re-trigger the effect).
  const handleSearchRef = useRef(handleSearch);
  useEffect(() => {
    handleSearchRef.current = handleSearch;
  });

  // The URL params are the source of truth for searching: run a search
  // whenever they change (initial mount, back/forward navigation, search
  // box, pagination).  handleSearch itself keeps the input boxes in sync
  // with these params.
  useEffect(() => {
    const query = searchParams.get('query') || '';
    const type = searchParams.get('type') || 'all';
    const itemTypeParam = searchParams.get('item_type') || 'book';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    handleSearchRef.current?.(query, type, page, limit, itemTypeParam);
    document.querySelector('.ant-card-body')?.scrollIntoView();
  }, [searchParams]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  };

  const handleSearchTypeChange = (value) => {
    setSearchType(value)
  };

  const handleItemTypeChange = (value) => {
    setItemType(value)
    updateSearchParams(searchQuery, searchType, 1, true, value)
  };

  const handleSearchSubmit = () => {
    updateSearchParams(searchQuery, searchType, 1, true)
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleCreate = async (values) => {
    try {
      await apiClient.makeCall("bibliography/", { ...values, dataset: values.dataset || "" }, { method: "POST" });
      message.success(t("Bibliography item created successfully"));
      updateSearchParams();
      setShowModal(false);
      form.resetFields();
    } catch (e) {
      message.error(t("Failed to create bibliography item") + ": " + e);
    }
  };

  const handleUpdate = async (values) => {
    try {
      await apiClient.makeCall(`bibliography/${editingItem.id}`, values, { method: "PUT" });
      message.success(t("Bibliography item updated successfully"));
      updateSearchParams();
      setShowModal(false);
      setEditingItem(null);
      form.resetFields();
    } catch (e) {
      message.error(t("Failed to update bibliography item") + ": " + e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.makeCall(`bibliography/${id}`, null, { method: "DELETE" });
      message.success(t("Bibliography item deleted"));
      updateSearchParams();
    } catch (e) {
      message.error(t("Failed to delete bibliography item") + ": " + e);
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      item_type: record.item_type,
      title: record.title,
      authors: record.authors,
      abstract_note: record.abstract_note,
      publication: record.publication,
      date: record.date ? dayjs(record.date) : null,
      volume: record.volume,
      issue: record.issue,
      pages: record.pages,
      doi: record.doi,
      url: record.url,
      isbn: record.isbn,
      issn: record.issn,
      archive: record.archive,
      archive_location: record.archive_location,
      library_catalog: record.library_catalog,
      call_number: record.call_number,
      language: record.language,
      short_title: record.short_title,
      series: record.series,
      series_title: record.series_title,
      publisher: record.publisher,
      place: record.place,
      notes: record.notes,
      tags: record.tags?.join(', '),
      related: record.related,
      file_attachments: record.file_attachments || [],
      extra: record.extra ? JSON.stringify(record.extra, null, 2) : '',
    });
    setShowModal(true);
  };

  const handleView = (record) => {
    setSelectedItem(record);
  };

  // Relative path of the stored file (empty for pure bibliographic entries)
  const getItemFilePath = (item) => item.file_attachments?.[0]
    || (item.path && !item.path.startsWith('bib:') ? item.path : '');

  // "View" opens the online PDF reader (SPA route /files/<path>)
  const handleOpenReader = (item) => {
    const p = getItemFilePath(item);
    if (p) navigate(`/files/${p}`);
  };

  // Download the attached file as a blob (the plain /files/ URL falls back to index.html)
  const handleDownloadFile = async (item) => {
    const p = getItemFilePath(item);
    if (!p) return;
    try {
      const { url } = await apiClient.download(`files/${p}`);
      const link = document.createElement('a');
      link.href = url;
      link.download = p.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error(t("download_failed") + ": " + e);
    }
  };

  // Import/Export handlers
  const handleSyncCalibre = async () => {
    try {
      setLoading(true);
      const response = await apiClient.makeCall("bibliography/sync/calibre", null, { method: "POST" });
      message.success(response.message || `Imported ${response.count} items from Calibre`);
      updateSearchParams();
    } catch (e) {
      message.error(t("Failed to sync from Calibre") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncZotero = async () => {
    try {
      setLoading(true);
      const response = await apiClient.makeCall("bibliography/sync/zotero", null, { method: "POST" });
      message.success(response.message || `Imported ${response.count} items from Zotero`);
      updateSearchParams();
    } catch (e) {
      message.error(t("Failed to sync from Zotero") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBibtex = async (file) => {
    try {
      setLoading(true);
      const text = await file.text();
      const response = await apiClient.makeCall("bibliography/import/bibtex", {
        bibtex_text: text,
        dataset_name: file.name.replace('.bib', '')
      }, { method: "POST" });
      message.success(response.message || `Imported ${response.count} items from BibTeX`);
      updateSearchParams();
      setShowBibtexModal(false);
      setBibtexText('');
    } catch (e) {
      message.error(t("Failed to import BibTeX") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async () => {
    let values;
    try {
      values = await uploadForm.validateFields();
    } catch {
      return; // validation errors are shown by the form
    }
    const f = values.file?.[0]?.originFileObj;
    if (!f) {
      message.warning(t("please_select_a_pdf_file"));
      return;
    }
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      message.error(t("only_pdf_allowed"));
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', f);
      (values.authors || []).forEach((a) => fd.append('authors', a));
      if (values.title) fd.append('title', values.title);
      fd.append('item_type', values.item_type || 'book');
      const data = await apiClient.uploadBibliographyPdf(fd);
      if (data?.success) {
        message.success(data.message || t("pdf_uploaded"));
        setShowUploadModal(false);
        uploadForm.resetFields();
        setPathPreview('');
        updateSearchParams();
      } else {
        message.error(data?.message || t("pdf_upload_failed"));
      }
    } catch (e) {
      message.error(t("pdf_upload_failed") + ": " + e);
    } finally {
      setUploading(false);
    }
  };

  const openUploadPdfModal = () => {
    uploadForm.resetFields();
    setPathPreview('');
    setShowUploadModal(true);
  };

  const uploadPdfFileDirect = (file) => {
    uploadForm.setFieldsValue({
      file: [{
        uid: String(Date.now() + Math.random()),
        name: file.name,
        status: 'done',
        originFileObj: file,
      }],
      // Sensible default for the literature type when opening via drag & drop
      item_type: uploadForm.getFieldValue('item_type') || 'book',
    });
    setShowUploadModal(true);
  };

  const hasDraggedFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  const handleListDragEnter = (e) => {
    if (!hasDraggedFiles(e) || showUploadModal) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setDragPdfOver(true);
  };

  const handleListDragOver = (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleListDragLeave = (e) => {
    if (!hasDraggedFiles(e)) return;
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setDragPdfOver(false);
  };

  const handleListDrop = (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragPdfOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (!dropped.length) return;
    const pdfFiles = dropped.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfFiles.length) {
      message.error(t("only_pdf_allowed"));
      return;
    }
    if (pdfFiles.length > 1) {
      message.info(t("only_first_pdf_uploaded"));
    }
    uploadPdfFileDirect(pdfFiles[0]);
  };

  const handlePasteBibtex = async () => {
    if (!bibtexText.trim()) {
      message.warning(t("Please enter BibTeX text"));
      return;
    }
    try {
      setLoading(true);
      const response = await apiClient.makeCall("bibliography/import/bibtex", {
        bibtex_text: bibtexText,
        dataset_name: 'BibTeX Import'
      }, { method: "POST" });
      message.success(response.message || `Imported ${response.count} items from BibTeX`);
      updateSearchParams();
      setShowBibtexModal(false);
      setBibtexText('');
    } catch (e) {
      message.error(t("Failed to import BibTeX") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBibtex = async (item) => {
    try {
      setLoading(true);
      const response = await apiClient.makeCall("bibliography/export/bibtex", [item.id], { method: "POST" });
      if (response.success && response.bibtex) {
        const blob = new Blob([response.bibtex], { type: 'text/x-bibtex' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bibliography.bib';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success(t("Exported to BibTeX file"));
      } else {
        message.error(t("Failed to export BibTeX"));
      }
    } catch (e) {
      message.error(t("Failed to export BibTeX") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: t("cover"),
      key: "cover",
      width: 80,
      render: (_, item) => {
        return (
          <div
            style={{
              width: 50,
              height: 75,
              background: 'var(--bg-secondary)',
              borderRadius: 2,
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            onClick={() => handleView(item)}
          >
            <BibItemCover item={item} />
          </div>
        );
      },
    },
    {
      title: t("title"),
      dataIndex: "title",
      key: "title",
      width: 300,
      render: (text, record) => (
        <a
          href={`/files/${record.file_attachments[0]}`}
          target="_blank"
        >
          <strong>{text}</strong>
          {record.doi && <Tag style={{ marginLeft: 8 }} size="small">{record.doi}</Tag>}
        </a>
      ),
    },
    {
      title: t("author"),
      dataIndex: "authors",
      key: "authors",
      width: 200,
      render: (authors) => (
        authors?.map(author => (
          <div
            key={author}
            style={{ cursor: 'pointer', color: 'var(--primary-color)' }}
            onClick={(e) => {
              e.stopPropagation();
              // Open the author search in a new window instead of
              // re-running it in place, so the current list stays put.
              openAuthorSearch(author, itemType);
            }}
          >
            {author}
          </div>))
      ),
    },
    {
      title: t("item_type"),
      dataIndex: "item_type",
      key: "item_type",
      width: 120,
      render: (text) => <Tag>{formatItemType(t, text)}</Tag>,
    },
    {
      title: t("publication"),
      dataIndex: "publication",
      key: "publication",
      width: 200,
    },
    {
      title: t("date"),
      dataIndex: "date",
      key: "date",
      width: 120,
    },
    {
      title: t("file_path"),
      key: "file_path",
      width: 230,
      render: (_, record) => {
        const p = record.file_attachments?.[0]
          || (record.path && !record.path.startsWith('bib:') ? record.path : '');
        return p ? (
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12 }}
            copyable={{
              text: p,
              icon: <CopyOutlined style={{ color: 'var(--primary)' }} />,
            }}
            ellipsis={{ tooltip: p }}
          >
            {p}
          </Typography.Text>
        ) : (
          ''
        );
      },
    },
    {
      title: t("action"),
      key: "actions",
      width: 200,
      render: (_, record) => {
        const p = getItemFilePath(record);
        return (
          <Space size="small">
            {p && (
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenReader(record)}>
                {t("view")}
              </Button>
            )}
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              {t("edit")}
            </Button>
            {p && (
              <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadFile(record)}>
                {t("download")}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            {t("bibliography_items")}
            <Space size="small">
              <Input
                placeholder={t("search")}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyUp={handleKeyPress}
                style={{ width: 200 }}
              />
              <Select
                value={searchType}
                onChange={handleSearchTypeChange}
                style={{ width: 120 }}
                options={[
                  { label: t("all_fields"), value: 'all' },
                  { label: t("title"), value: 'title' },
                  { label: t("author"), value: 'author' },
                  { label: t("tag"), value: 'tag' },
                ]}
              />
              <Select
                value={itemType}
                onChange={handleItemTypeChange}
                style={{ width: 170 }}
                showSearch
                placeholder={t("item_type")}
                options={[
                  { label: t("all_item_types"), value: 'all' },
                  ...getItemTypeOptions(t),
                ]}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  || String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
              <Button
                type="primary"
                onClick={handleSearchSubmit}
                icon={<SearchOutlined />}
              >
                {t("search")}
              </Button>
              {searchQuery && (
                <Button onClick={() => {
                  setSearchParams({});
                }}>
                  {t("clear")}
                </Button>
              )}
            </Space>
          </Space>
        }
        style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}
      >
        <Space size="small">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingItem(null);
              form.resetFields();
              setShowModal(true);
            }}
          >
            {t("create_new")}
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={openUploadPdfModal}
          >
            {t("upload_pdf")}
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'sync-calibre',
                  icon: <SyncOutlined />,
                  label: t("sync_calibre"),
                  onClick: handleSyncCalibre,
                },
                {
                  key: 'sync-zotero',
                  icon: <SyncOutlined />,
                  label: t("sync_zotero"),
                  onClick: handleSyncZotero,
                },
                {
                  type: 'divider',
                },
                {
                  key: 'paste-bibtex',
                  icon: <FileTextOutlined />,
                  label: t("paste_bibtex"),
                  onClick: () => setShowBibtexModal(true),
                },
                {
                  key: 'upload-pdf',
                  icon: <FilePdfOutlined />,
                  label: t("upload_pdf"),
                  onClick: openUploadPdfModal,
                },
                {
                  key: 'upload-bibtex',
                  icon: <UploadOutlined />,
                  label: t("upload_bibtex"),
                  onClick: () => fileInputRef.current?.click(),
                },
                {
                  type: 'divider',
                },
              ],
            }}
            trigger={['click']}
          >
            <Button icon={<CodeOutlined />}>
              {t("more_actions")}
            </Button>
          </Dropdown>
          <input
            type="file"
            accept=".bib"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadBibtex(file);
              }
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          />
        </Space>
        <Space size="small" style={{ marginLeft: 16 }}>
          <Button
            icon={<UnorderedListOutlined />}
            type={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => setViewMode('list')}
          >
            {t("list_view")}
          </Button>
          <Button
            icon={<DashboardOutlined />}
            type={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => setViewMode('grid')}
          >
            {t("grid_view")}
          </Button>
        </Space>

        <Divider></Divider>

        <div
          onDragEnter={handleListDragEnter}
          onDragOver={handleListDragOver}
          onDragLeave={handleListDragLeave}
          onDrop={handleListDrop}
          style={{ position: 'relative' }}
        >
          {viewMode === 'list' ? (
            <Table
              columns={columns}
              dataSource={bibItems}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize,
                current: currentPage,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (page, size) => {
                  updateSearchParams(searchQuery, searchType, page, true, itemType, size);
                }
              }}
            />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: screens.md ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 16 }}>
                {bibItems.map((item) => (
                  <BibItemDisplay
                    key={item.id}
                    item={item}
                    itemType={itemType}
                    onEdit={handleEdit}
                    onView={handleOpenReader}
                    onShowDetail={handleView}
                    onDownload={handleDownloadFile}
                    onExportBibtex={handleExportBibtex}
                  />
                ))}
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalCount}
                  showSizeChanger
                  pageSizeOptions={[10, 20, 50, 100]}
                  onChange={(page, size) => {
                    updateSearchParams(searchQuery, searchType, page, true, itemType, size);
                  }}
                />
              </div>
            </>
          )}
          {dragPdfOver && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'var(--panel-bg)',
                opacity: 0.9,
                border: '2px dashed var(--primary-color)',
                borderRadius: 8,
                pointerEvents: 'none',
              }}
            >
              <FilePdfOutlined style={{ fontSize: 48, color: 'var(--primary-color)' }} />
              <Typography.Title level={5} style={{ margin: 0, color: 'var(--primary-color)' }}>
                {t("drop_pdf_to_upload")}
              </Typography.Title>
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingItem ? t("edit") : t("create_new")}
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setEditingItem(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <BibItemEditForm
          item={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowModal(false);
            setEditingItem(null);
            form.resetFields();
          }}
          onDelete={handleDelete}
        />
      </Modal>

      {/* Upload PDF Modal */}
      <Modal
        title={t("upload_pdf")}
        open={showUploadModal}
        onCancel={() => {
          setShowUploadModal(false);
          uploadForm.resetFields();
          setPathPreview('');
        }}
        onOk={handleUploadPdf}
        confirmLoading={uploading}
        okText={t("upload")}
        width={560}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item
            name="file"
            label={t("file")}
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: t("please_select_a_pdf_file") }]}
          >
            <Upload.Dragger accept=".pdf,application/pdf" maxCount={1} beforeUpload={() => false}>
              <p className="ant-upload-drag-icon">
                <FilePdfOutlined />
              </p>
              <p className="ant-upload-text">{t("click_or_drag_pdf_here")}</p>
              <p className="ant-upload-hint">{t("only_pdf_allowed")}</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item
            name="authors"
            label={t("author")}
            rules={[{ required: true, message: t("please_enter_authors") }]}
            extra={pathPreview || t("authors_storage_hint")}
          >
            <AuthorsSelect placeholder={t("e_g_john_cage")} />
          </Form.Item>
          <Form.Item
            name="title"
            label={t("title")}
            extra={t("title_autofill_from_filename")}
          >
            <Input placeholder={t("title_autofill_from_filename")} />
          </Form.Item>
          <Form.Item
            name="item_type"
            label={t("item_type")}
            initialValue="book"
          >
            <Select
              showSearch
              options={getItemTypeOptions(t)}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                || String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Paste BibTeX Modal */}
      <Modal
        title={t("import_bibtex")}
        open={showBibtexModal}
        onCancel={() => {
          setShowBibtexModal(false);
          setBibtexText('');
        }}
        onOk={handlePasteBibtex}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label={t("bibtex_text")}>
            <Input.TextArea
              rows={10}
              placeholder={t("Paste BibTeX text here...")}
              value={bibtexText}
              onChange={(e) => setBibtexText(e.target.value)}
              suffix={
                <Button type="link" icon={<FileTextOutlined />} onClick={() => {
                  navigator.clipboard.readText().then(text => {
                    setBibtexText(text);
                  }).catch(() => {
                    message.warning(t("Failed to read clipboard"));
                  });
                }}>
                  {t("paste_from_clipboard")}
                </Button>
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Info for selected item */}
      <Modal
        title={t("bibliography_detail")}
        open={!!selectedItem}
        onCancel={() => setSelectedItem(null)}
        footer={null}
        width={800}
      >
        <BibItemDetailContent item={selectedItem} itemType={itemType} onExportBibtex={() => handleExportBibtex(selectedItem)} />
      </Modal>
    </>
  );
}
