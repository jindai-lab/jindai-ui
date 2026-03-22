import { Card, Space, Button, Modal } from "antd";
import { useState } from "react";
import { EyeOutlined, CodeOutlined } from "@ant-design/icons";
import { getCoverUrl, getDefaultCover } from "./bib-item-detail-content";
import { useTranslation } from "react-i18next";

export default function BibItemDisplay({ item, onEdit, onViewFile }) {
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
              getDefaultCover()
            )}
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
                {item.author}
              </div>
              {item.publication && <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{item.publication}</div>}
              {item.date && <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.date}</div>}
            </div>
          }
        />
        <Space size="small" style={{ marginTop: 12 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); onViewFile(item); }}>
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
