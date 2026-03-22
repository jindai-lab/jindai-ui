import { Tag, Space, Button } from "antd";
import { DownloadOutlined, CodeOutlined, BookOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiClient } from "../api";
import { useTranslation } from "react-i18next";

export function getDefaultCover() {
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

export function getCoverUrl(item) {
  if (item.cover) {
      return `/api/v2/files/${item.cover}`
  }
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
}

export function handleDownload(attachment, t) {
  return async () => {
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
      // message.error(t("download_failed"));
    }
  };
}

export function BibItemDetailContent({ item, onExportBibtex }) {
  const { t } = useTranslation();

  if (!item) return null;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: '0 0 150px' }}>
          {getCoverUrl(item) ? (
            <img
              src={getCoverUrl(item)}
              alt={item.title}
              style={{ width: 150, height: 225, objectFit: 'cover', borderRadius: 4 }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.innerHTML = '';
              }}
            />
          ) : (
            getDefaultCover()
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0' }}>{item.title}</h2>
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>
            {item.author}
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
              <Space>
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
                        icon={<DownloadOutlined />}
                        onClick={handleDownload(attachment, t)}
                      >
                        {t("download")}
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
