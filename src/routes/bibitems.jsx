import { Card, Button, Table, Modal, Form, Input, message, Space, Tag, Popconfirm, Grid, Image, Upload, Dropdown, Select } from "antd";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, BookOutlined, DashboardOutlined, UnorderedListOutlined, DownloadOutlined, SyncOutlined, UploadOutlined, FileTextOutlined, CodeOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { useBreakpoint } = Grid;

export default function BibItemsPage() {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bibItems, setBibItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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
  const [selectedItemsForExport, setSelectedItemsForExport] = useState([]);
  const fileInputRef = useRef(null);

  // Initialize search state from URL params
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  // Update URL params when search changes
  const updateSearchParams = (query, type, page = 1) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (type && type !== 'all') params.set('type', type);
    if (page > 1) params.set('page', page);
    setSearchParams(params);
  };

  useEffect(() => {
    // Load from URL params on mount
    const query = searchParams.get('query') || '';
    const type = { 'all': 'all', 'title': 'title', 'author': 'author' }[searchParams.get('type')] || 'all';
    const page = parseInt(searchParams.get('page')) || 1;
    setSearchQuery(query)
    setSearchType(type)
    handleSearch(query, type, page, 20);
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('bibitems_view_mode', viewMode);
  }, [viewMode]);

  const handleSearch = async (query = '', type = '', page = 1, limit = 20) => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const data = await apiClient.makeCall(`bibliography/search`, {
        query: query || searchQuery,
        type: type || searchType,
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
    } catch (e) {
      message.error(t("Failed to load bibliography items") + ": " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  };

  const handleSearchTypeChange = (value) => {
    setSearchType(value)
  };

  const handleSearchSubmit = () => {
    updateSearchParams(searchQuery, searchType)
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleCreate = async (values) => {
    try {
      const data = await apiClient.makeCall("bibliography/", { ...values, dataset: values.dataset || "" }, { method: "POST" });
      message.success(t("Bibliography item created successfully"));
      handleSearch();
      setShowModal(false);
      form.resetFields();
    } catch (e) {
      message.error(t("Failed to create bibliography item") + ": " + e);
    }
  };

  const handleUpdate = async (values) => {
    try {
      const data = await apiClient.makeCall(`bibliography/${editingItem.id}`, values, { method: "PUT" });
      message.success(t("Bibliography item updated successfully"));
      handleSearch();
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
      handleSearch();
    } catch (e) {
      message.error(t("Failed to delete bibliography item") + ": " + e);
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      item_type: record.item_type,
      title: record.title,
      author: record.author,
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
      file_attachments: record.file_attachments ? JSON.stringify(record.file_attachments, null, 2) : '',
      extra: record.extra ? JSON.stringify(record.extra, null, 2) : '',
    });
    setShowModal(true);
  };

  const handleView = (record) => {
    // Try to open PDF or EPUB file from file_attachments
    if (record.file_attachments && record.file_attachments.length > 0) {
      // Priority: PDF > EPUB
      const pdfAttachment = record.file_attachments.find(a =>
        (a.mimetype || '').includes('pdf') || (a.path || '').toLowerCase().endsWith('.pdf')
      );
      const epubAttachment = record.file_attachments.find(a =>
        (a.mimetype || '').includes('epub') || (a.path || '').toLowerCase().endsWith('.epub')
      );

      let attachment = pdfAttachment || epubAttachment;

      if (attachment) {
        // Construct file path
        let filePath = attachment.path;
        if (filePath && !filePath.startsWith('http')) {
          // For local files, use the files API
          window.open(`/files/${encodeURIComponent(filePath)}`, '_blank');
          return;
        } else if (filePath) {
          // For remote URLs, open directly
          window.open(filePath, '_blank');
          return;
        }
      }
    }
    // If no file found, show detail modal
    setSelectedItem(record);
  };

  const handleDownload = async (attachment) => {
    try {
      let filePath = attachment.path;
      if (filePath && !filePath.startsWith('http')) {
        // For local files, use the files API
        const url = `/files/${encodeURIComponent(filePath)}`;
        const { url: blobUrl } = await apiClient.download(url);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = attachment.title || attachment.path?.split('/').pop() || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else if (filePath) {
        // For remote URLs, trigger download
        const link = document.createElement('a');
        link.href = filePath;
        link.download = attachment.title || filePath.split('/').pop() || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      message.error(t("download_failed"));
    }
  };

  // Import/Export handlers
  const handleSyncCalibre = async () => {
    try {
      setLoading(true);
      const response = await apiClient.makeCall("bibliography/sync/calibre", null, { method: "POST" });
      message.success(response.message || `Imported ${response.count} items from Calibre`);
      handleSearch();
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
      handleSearch();
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
      handleSearch();
      setShowBibtexModal(false);
      setBibtexText('');
    } catch (e) {
      message.error(t("Failed to import BibTeX") + ": " + e);
    } finally {
      setLoading(false);
    }
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
      handleSearch();
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
      setSelectedItemsForExport([]);
    }
  };

  const getDefaultCover = (item) => {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        fontSize: '48px'
      }}>
        <BookOutlined />
      </div>
    );
  };

  const getCoverUrl = (item) => {
    if (item.file_attachments && item.file_attachments.length > 0) {
      // Try to find an image attachment
      for (const attachment of item.file_attachments) {
        const mimetype = attachment.mimetype || '';
        if (mimetype.startsWith('image/')) {
          // If it's a local file path, construct the URL
          if (attachment.path && !attachment.path.startsWith('http')) {
            return `/api/v2/files/${encodeURIComponent(attachment.path)}`;
          }
          return attachment.path;
        }
      }
      // If no image found, return the first attachment as a placeholder
      return null;
    }
    return null;
  };

  const columns = [
    {
      title: t("cover"),
      key: "cover",
      width: 80,
      render: (_, record) => {
        const coverUrl = getCoverUrl(record);
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
            onClick={() => handleView(record)}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={record.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '';
                }}
              />
            ) : (
              getDefaultCover(record)
            )}
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
        <div
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            updateSearchParams(text, 'title')
          }}
        >
          <strong>{text}</strong>
          {record.doi && <Tag style={{ marginLeft: 8 }} size="small">{record.doi}</Tag>}
        </div>
      ),
    },
    {
      title: t("author"),
      dataIndex: "author",
      key: "author",
      width: 200,
      render: (text, record) => (
        <div
          style={{ cursor: 'pointer', color: 'var(--primary-color)' }}
          onClick={(e) => {
            e.stopPropagation();
            updateSearchParams(text, 'author', 1, 20);
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: t("item_type"),
      dataIndex: "item_type",
      key: "item_type",
      width: 120,
      render: (text) => <Tag>{text || 'Unknown'}</Tag>,
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
      title: t("action"),
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            {t("view")}
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t("edit")}
          </Button>
          <Popconfirm
            title={t("Are you sure you want to delete this item?")}
            onConfirm={() => handleDelete(record.id)}
            okText={t("confirm")}
            cancelText={t("cancel")}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t("delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
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
                ]}
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
          </Space>
        }
        style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}
      >
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={bibItems}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 20,
              current: currentPage,
              total: totalCount,
              onChange: (page) => {
                updateSearchParams(searchQuery, searchType, page);
              }
            }}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: screens.md ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 16 }}>
            {bibItems.map((item) => (
              <Card
                key={item.id}
                hoverable
                onClick={() => handleView(item)}
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                cover={
                  <div style={{ height: 150, overflow: 'hidden' }}>
                    {getCoverUrl(item) ? (
                      <img
                        src={getCoverUrl(item)}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      getDefaultCover(item)
                    )}
                  </div>
                }
              >
                <Card.Meta
                  title={<div
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSearchParams(item.title, 'title');
                    }}
                  >{item.title}</div>}
                  description={
                    <div>
                      <div
                        style={{ color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSearchParams(item.author, 'author');
                        }}
                      >
                        {item.author}
                      </div>
                      {item.publication && <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{item.publication}</div>}
                      {item.date && <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.date}</div>}
                    </div>
                  }
                />
                <Space size="small" style={{ marginTop: 12 }}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}>
                    {t("edit")}
                  </Button>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)}>
                    {t("delete")}
                  </Button>
                </Space>
              </Card>
            ))}
          </div>
        )}
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
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingItem ? handleUpdate : handleCreate}
        >
          <Form.Item
            name="title"
            label={t("title")}
            rules={[{ required: true, message: t("Please enter a title") }]}
          >
            <Input placeholder={t("e_g_the_art_of_computer_programming")} />
          </Form.Item>

          <Form.Item
            name="author"
            label={t("author")}
          >
            <Input placeholder={t("e_g_donald_e_knuth")} />
          </Form.Item>

          <Form.Item
            name="item_type"
            label={t("item_type")}
          >
            <Input placeholder={t("e_g_book_journalarticle")} />
          </Form.Item>

          <Form.Item
            name="publication"
            label={t("publication")}
          >
            <Input placeholder={t("e_g_addison_wesley")} />
          </Form.Item>

          <Form.Item
            name="date"
            label={t("date")}
          >
            <Input placeholder={t("e_g_2011_03_04")} />
          </Form.Item>

          <Form.Item
            name="doi"
            label={t("doi")}
          >
            <Input placeholder={t("e_g_10_1002_9781118175324")} />
          </Form.Item>

          <Form.Item
            name="url"
            label={t("url")}
          >
            <Input placeholder={t("e_g_https_example_com")} />
          </Form.Item>

          <Form.Item
            name="isbn"
            label={t("isbn")}
          >
            <Input placeholder={t("e_g_978_0201896831")} />
          </Form.Item>

          <Form.Item
            name="abstract_note"
            label={t("abstract_note")}
          >
            <Input.TextArea rows={3} placeholder={t("Enter abstract...")} />
          </Form.Item>

          <Form.Item
            name="notes"
            label={t("notes")}
          >
            <Input.TextArea rows={2} placeholder={t("Enter notes...")} />
          </Form.Item>

          <Form.Item
            name="tags"
            label={t("tags")}
          >
            <Input placeholder={t("e_g_computer_programming_algorithms")} />
          </Form.Item>

          <Form.Item
            name="dataset"
            label={t("dataset")}
          >
            <Input placeholder={t("Enter dataset name...")} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t("save")}
              </Button>
              <Button onClick={() => {
                setShowModal(false);
                setEditingItem(null);
                form.resetFields();
              }}>
                {t("cancel")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        title={t("bibliography_detail")}
        open={!!selectedItem}
        onCancel={() => setSelectedItem(null)}
        footer={null}
        width={800}
      >
        {selectedItem && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: '0 0 150px' }}>
                {getCoverUrl(selectedItem) ? (
                  <img
                    src={getCoverUrl(selectedItem)}
                    alt={selectedItem.title}
                    style={{ width: 150, height: 225, objectFit: 'cover', borderRadius: 4 }}
                  />
                ) : (
                  getDefaultCover(selectedItem)
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 8px 0' }}>{selectedItem.title}</h2>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>
                  {selectedItem.author}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {selectedItem.item_type && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("item_type")}</div>
                      <div>{selectedItem.item_type}</div>
                    </div>
                  )}
                  {selectedItem.publication && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("publication")}</div>
                      <div>{selectedItem.publication}</div>
                    </div>
                  )}
                  {selectedItem.publisher && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("publisher")}</div>
                      <div>{selectedItem.publisher}</div>
                    </div>
                  )}
                  {selectedItem.place && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("place")}</div>
                      <div>{selectedItem.place}</div>
                    </div>
                  )}
                  {selectedItem.date && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("date")}</div>
                      <div>{selectedItem.date === '0101-01-01' ? '-' : dayjs(selectedItem.date).format('YYYY-MM-DD')}</div>
                    </div>
                  )}
                  {selectedItem.volume && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("volume")}</div>
                      <div>{selectedItem.volume}</div>
                    </div>
                  )}
                  {selectedItem.issue && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("issue")}</div>
                      <div>{selectedItem.issue}</div>
                    </div>
                  )}
                  {selectedItem.pages && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("pages")}</div>
                      <div>{selectedItem.pages}</div>
                    </div>
                  )}
                  {selectedItem.doi && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("doi")}</div>
                      <div>{selectedItem.doi}</div>
                    </div>
                  )}
                  {selectedItem.url && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("url")}</div>
                      <div>
                        <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                          {selectedItem.url}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedItem.isbn && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("isbn")}</div>
                      <div>{selectedItem.isbn}</div>
                    </div>
                  )}
                  {selectedItem.language && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("language")}</div>
                      <div>{selectedItem.language}</div>
                    </div>
                  )}
                </div>

                {selectedItem.abstract_note && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("abstract_note")}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.abstract_note}</div>
                  </div>
                )}

                {selectedItem.notes && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("notes")}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedItem.notes}</div>
                  </div>
                )}

                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("tags")}</div>
                    <Space>
                      {selectedItem.tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {selectedItem.file_attachments && selectedItem.file_attachments.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("file_attachments")}</div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {selectedItem.file_attachments.map((attachment, index) => (
                        <li key={index} style={{ marginBottom: 8 }}>
                          <Space>
                            <span>{attachment.title || attachment.path || JSON.stringify(attachment)}</span>
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownload(attachment)}
                            >
                              {t("download")}
                            </Button>
                          </Space>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button size="small" icon={<CodeOutlined />} onClick={() => handleExportBibtex(selectedItem)}>{t("export_bibtex")}</Button>

              </div>
            </div>
          </div>
        )}
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
                  }).catch(err => {
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
    </>
  );
}
