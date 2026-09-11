import { Card, Space, Button, Modal, Tag } from "antd";
import { EyeOutlined, CodeOutlined, DownloadOutlined } from "@ant-design/icons";
import { BibItemCover } from "./bib-item-detail-content";
import { useTranslation } from "react-i18next";

export default function BibItemDisplay({ item, onEdit, onView }) {
  const { t } = useTranslation();

  // Relative path of the stored file (hidden for pure bibliographic entries)
  const filePath = item.file_attachments?.[0]
    || (item.path && !item.path.startsWith('bib:') ? item.path : '');

  return (
    <>
      <Card
        hoverable
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        cover={
          filePath ? (
            <a
              href={`/files/${filePath}`}
              target="_blank" style={{ height: 150, overflow: 'hidden' }}>
              <BibItemCover item={item} fit="cover" />
            </a>
          ) : (
            <div style={{ height: 150, overflow: 'hidden' }}>
              <BibItemCover item={item} fit="cover" />
            </div>
          )
        }
      >
        <Card.Meta
          title={<div style={{ cursor: 'pointer' }}>{item.title}</div>}
          description={
            <div>
              <div
                style={{ color: 'var(--text-secondary)', fontSize: 14 }}
              >
                {item.authors?.map(author => <Tag>{author}</Tag>)}
              </div>
              {item.publication && <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{item.publication}</div>}
              {item.date && <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.date}</div>}
              {filePath && (
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  marginTop: 4,
                  wordBreak: 'break-all',
                }}>
                  {filePath}
                </div>
              )}
            </div>
          }
        />
        <Space size="small" style={{ marginTop: 12 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); onView(item); }}>
            {t("view")}
          </Button>
          <Button size="small" icon={<CodeOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
            {t("edit")}
          </Button>
          {filePath && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              href={`/files/${filePath}`}
              download
              onClick={(e) => e.stopPropagation()}
            >
              {t("download")}
            </Button>
          )}
        </Space>
      </Card>

    </>
  );
}
