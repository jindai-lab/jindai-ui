import { Card, Space, Button, Tag } from "antd";
import { DownloadOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { BibItemCover } from "./bib-item-detail-content";
import { useTranslation } from "react-i18next";
import { formatItemType } from "./item-types";
import { openAuthorSearch } from "../author-search";

export default function BibItemDisplay({ item, itemType, onEdit, onView, onShowDetail, onDownload }) {
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
          <div
            style={{ height: 150, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => onShowDetail(item)}
          >
            <BibItemCover item={item} fit="contain" />
          </div>
        }
      >
        <Card.Meta
          title={<div style={{ cursor: 'pointer' }}>{item.title}</div>}
          description={
            <div>
              {item.item_type && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color="geekblue" style={{ marginInlineEnd: 0 }}>
                    {formatItemType(t, item.item_type)}
                  </Tag>
                </div>
              )}
              <div
                style={{ color: 'var(--text-secondary)', fontSize: 14 }}
              >
                {item.authors?.map(author => (
                  <Tag
                    key={author}
                    style={{ cursor: 'pointer', color: 'var(--primary-color)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Clicking an author opens a new window with that
                      // author's full bibliography.
                      openAuthorSearch(author, itemType);
                    }}
                  >
                    {author}
                  </Tag>
                ))}
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
          {filePath && (
            <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); onView(item); }}>
              {t("view")}
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
            {t("edit")}
          </Button>
          {filePath && (
            <Button size="small" icon={<DownloadOutlined />} onClick={(e) => { e.stopPropagation(); onDownload(item); }}>
              {t("download")}
            </Button>
          )}
        </Space>
      </Card>

    </>
  );
}
