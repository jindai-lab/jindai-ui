import { CodeOutlined, DashboardOutlined, EditOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, SearchOutlined, SyncOutlined, UnorderedListOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Divider, Dropdown, Form, Grid, Input, message, Modal, Pagination, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api";
import { BibItemCover, BibItemDetailContent } from "../components/bib-item-detail-content";
import BibItemDisplay from "../components/bib-item-display";
import BibItemEditForm from "../components/bib-item-edit-form";

const { useBreakpoint } = Grid;

export default function BibliothekPage() {
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
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Initialize search state from URL params
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');

  // Update URL params when search changes
  const updateSearchParams = (query, type, page = 1, force = true) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (type && type !== 'all') params.set('type', type);
    if (page > 1) params.set('page', page);
    if (force) params.set('t', new Date().getTime())
    setSearchParams(params);
  };

  useEffect(() => {
    // Load from URL params on mount
    const query = searchParams.get('query') || '';
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page')) || 1;
    setSearchQuery(query)
    setSearchType(['tag', 'title', 'author', 'all'].includes(type) ? type : 'all')
    handleSearch(query, type, page, 20);
    document.querySelector('.ant-card-body').scrollIntoView()
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
    updateSearchParams(searchQuery, searchType, 1, true)
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
      updateSearchParams();
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
      file_attachments: record.file_attachments ? JSON.stringify(record.file_attachments, null, 2) : '',
      extra: record.extra ? JSON.stringify(record.extra, null, 2) : '',
    });
    setShowModal(true);
  };

  const handleView = (record) => {
    setSelectedItem(record);
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
      setSelectedItemsForExport([]);
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
      render: (authors, record) => (
        authors.map(author => (
          <div
            style={{ cursor: 'pointer', color: 'var(--primary-color)' }}
            onClick={(e) => {
              e.stopPropagation();
              updateSearchParams(author, 'author', 1, 20);
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
                  { label: t("tag"), value: 'tag' },
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

        <Divider></Divider>

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
          <>
            <div style={{ display: 'grid', gridTemplateColumns: screens.md ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 16 }}>
              {bibItems.map((item) => (
                <BibItemDisplay
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onView={handleView}
                  onExportBibtex={handleExportBibtex}
                />
              ))}
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Pagination
                current={currentPage}
                pageSize={20}
                total={totalCount}
                onChange={(page) => {
                  updateSearchParams(searchQuery, searchType, page);
                }}
              />
            </div>
          </>
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

      {/* Detail Info for selected item */}
      <Modal
        title={t("bibliography_detail")}
        open={!!selectedItem}
        onCancel={() => setSelectedItem(null)}
        footer={null}
        width={800}
      >
        <BibItemDetailContent item={selectedItem} onExportBibtex={() => handleExportBibtex(selectedItem)} />
      </Modal>
    </>
  );
}
