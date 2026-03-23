import { Tag, Space, Button, Spin, message } from "antd";
import { DownloadOutlined, CodeOutlined, BookOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";


export function BibItemCover({ item, fit }) {
  const [coverUrl, setCoverUrl] = useState('')

  const getDefaultCover = () => {
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
  }

  const getCoverUrl = async (item) => {
    if (item.cover) {
      const downloaded = await apiClient.download(`files/${item.cover}`)
      return downloaded.url;
    }
    return null;
  }

  useEffect(() => {
    getCoverUrl(item).then(setCoverUrl)
  }, [item])

  return (
    coverUrl ? (
      <img
        src={coverUrl}
        alt={item.title}
        style={{ width: '100%', height: '100%', objectFit: fit || 'contain' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = '';
        }}
      />
    ) : (
      getDefaultCover()
    )
  )
}


export function BibItemDetailContent({ item, onExportBibtex }) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(null)

  if (!item) return null;

  const handleDownload = async (attachment) => {
    setDownloading(attachment);
    try {
      let filePath = attachment;
      if (filePath && !filePath.startsWith('http')) {
        // For local files, use the files API
        const url = `files/${filePath}`;
        const { url: blobUrl } = await apiClient.download(url);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = attachment.split('/').pop();
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
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: '0 0 150px' }}>
          <BibItemCover item={item} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0' }}>{item.title}</h2>
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>
            {item.authors.map(author => <Tag>{author}</Tag>)}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {item.item_type && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("item_type")}</div>
                <div>{item.item_type}</div>
              </div>
            )}
            {item.publication && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("publication")}</div>
                <div>{item.publication}</div>
              </div>
            )}
            {item.publisher && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("publisher")}</div>
                <div>{item.publisher}</div>
              </div>
            )}
            {item.place && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("place")}</div>
                <div>{item.place}</div>
              </div>
            )}
            {item.date && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("date")}</div>
                <div>{item.date === '0101-01-01' ? '-' : dayjs(item.date).format('YYYY-MM-DD')}</div>
              </div>
            )}
            {item.volume && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("volume")}</div>
                <div>{item.volume}</div>
              </div>
            )}
            {item.issue && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("issue")}</div>
                <div>{item.issue}</div>
              </div>
            )}
            {item.pages && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("pages")}</div>
                <div>{item.pages}</div>
              </div>
            )}
            {item.doi && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("doi")}</div>
                <div>{item.doi}</div>
              </div>
            )}
            {item.url && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("url")}</div>
                <div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.url}
                  </a>
                </div>
              </div>
            )}
            {item.isbn && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("isbn")}</div>
                <div>{item.isbn}</div>
              </div>
            )}
            {item.language && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("language")}</div>
                <div>{item.language}</div>
              </div>
            )}
          </div>

          {item.abstract_note && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("abstract_note")}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{item.abstract_note}</div>
            </div>
          )}

          {item.notes && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("notes")}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</div>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("tags")}</div>
              <Space style={{ flexWrap: "wrap" }}>
                {[...new Set(item.tags)].map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))}
              </Space>
            </div>
          )}

          {item.file_attachments && item.file_attachments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t("file_attachments")}</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {item.file_attachments.map((attachment, index) => (
                  <li key={index} style={{ marginBottom: 8 }}>
                    <Space>
                      <span>{attachment.split('/').pop(0)}</span>
                      <Button
                        size="small"
                        icon={downloading === attachment ? <Spin spin /> : <DownloadOutlined />}
                        onClick={() => handleDownload(attachment)}
                      >
                        {downloading === attachment ? t("downloading") : t("download")}
                      </Button>
                    </Space>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Button size="small" icon={<CodeOutlined />} onClick={() => onExportBibtex(item)}>{t("export_bibtex")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
