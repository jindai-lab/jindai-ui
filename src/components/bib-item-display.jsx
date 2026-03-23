import { Card, Space, Button, Modal, Tag } from "antd";
import { EyeOutlined, CodeOutlined } from "@ant-design/icons";
import { BibItemCover } from "./bib-item-detail-content";
import { useTranslation } from "react-i18next";

export default function BibItemDisplay({ item, onEdit, onView }) {
  const { t } = useTranslation();

  return (
    <>
      <Card
        hoverable
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        cover={
          <a
            href={`/files/${item.file_attachments[0]}`}
            target="_blank" style={{ height: 150, overflow: 'hidden' }}>
            <BibItemCover item={item} fit="cover" />
          </a>
        }
      >
        <Card.Meta
          title={<div style={{ cursor: 'pointer' }}>{item.title}</div>}
          description={
            <div>
              <div
                style={{ color: 'var(--text-secondary)', fontSize: 14 }}
              >
                {item.authors.map(author => <Tag>{author}</Tag>)}
              </div>
              {item.publication && <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{item.publication}</div>}
              {item.date && <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.date}</div>}
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
        </Space>
      </Card>

    </>
  );
}
