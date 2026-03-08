import { Card, Row, Col, Button, Checkbox, Input, Select, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import { ClearOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import DatasetSelector from "./dataset-selector";
import FileSourceSelector from "./filesource-selector";
import RemoteFilterSelector from "./remote-filter-selector";

const { Text } = Typography;
const { Option } = Select;

/**
 * Search Filter Bar Component
 * Contains search input, dataset/source selectors, and filter controls
 */
export const SearchFilterBar = ({ filters, updateFilter, executeSearch }) => {
  const { t } = useTranslation();
  const handleReset = () => {
    updateFilter({
      q: "",
      datasets: [],
      sources: [],
      embeddings: false,
      sort: "",
      groupBy: "",
      outline: [],
      authors: [],
      page: 1,
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.q?.trim()) count++;
    if (filters.datasets?.length) count++;
    if (filters.sources?.length) count++;
    if (filters.outline?.length) count++;
    if (filters.authors?.length) count++;
    if (filters.lang?.length) count++;
    if (filters.sort) count++;
    if (filters.groupBy) count++;
    if (filters.embeddings) count++;
    return count;
  }, [filters]);

  return (
    <Card
      size="small"
      style={{
        marginBottom: 24,
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
        background: 'var(--panel-bg)',
        color: 'var(--text)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 第一行：搜索核心区 - 突出主要操作 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          paddingBottom: 20,
          position: 'relative'
        }}>
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <Input.Search
              placeholder={t("search")}
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={filters.q}
              onChange={(e) => updateFilter({ q: e.target.value })}
              onSearch={() => executeSearch(updateFilter({ page: 1 }), true)}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            />
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 0'
          }}>
            <Checkbox
              checked={filters.embeddings}
              onChange={(e) => updateFilter({ embeddings: e.target.checked })}
              style={{
                fontSize: 14,
                color: filters.embeddings ? 'var(--primary)' : '#666'
              }}
            >
              <span style={{ color: filters.embeddings ? 'var(--primary)' : '#666', fontWeight: filters.embeddings ? 500 : 400 }}>
                {t("semantic_matching")}
              </span>
            </Checkbox>
          </div>
        </div>

        {/* 第二行：主要筛选区 - 使用 Row/Col 响应式布局 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <FilterItem label={t("dataset")}>
              <DatasetSelector
                multiple
                value={filters.datasets}
                onChange={(v) => updateFilter({ datasets: v })}
                style={{ width: '100%' }}
              />
            </FilterItem>
          </Col>
          <Col xs={24} lg={12}>
            <FilterItem label={t("file_source")}>
              <FileSourceSelector
                multiple
                value={filters.sources}
                onChange={(v) => updateFilter({ sources: v })}
                style={{ width: '100%' }}
              />
            </FilterItem>
          </Col>
        </Row>

        {/* 第三行：次要筛选与排序 - 更加紧凑 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-start',
          background: 'var(--panel-bg)',
          padding: '16px 20px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          color: 'var(--text)'
        }}>
          <FilterItem label={t("outline")}>
            <RemoteFilterSelector
              filters={filters}
              multiple
              column="outline"
              onChange={(v) => updateFilter({ outline: v })}
              value={filters.outline}
              style={{ width: 160 }}
            />
          </FilterItem>

          <FilterItem label={t("author")}>
            <RemoteFilterSelector
              multiple
              filters={filters}
              column="author"
              onChange={(v) => updateFilter({ authors: v })}
              value={filters.authors}
              style={{ width: 140 }}
            />
          </FilterItem>

          <FilterItem label={t("sort")}>
            <Select
              value={filters.sort}
              onChange={(v) => updateFilter({ sort: v })}
              style={{ width: 130 }}
              disabled={filters.embeddings}
              placeholder={t("relevance")}
            >
              <Option value={t("relevance")}>{t("relevance")}</Option>
              <Option value={t("date_asc")}>{t("date_asc")}</Option>
              <Option value={t("date_desc")}>{t("date_desc")}</Option>
              <Option value={t("outline")}>{t("outline")}</Option>
              <Option value={t("source")}>{t("source")}</Option>
            </Select>
          </FilterItem>

          <FilterItem label={t("grouping")}>
            <Select
              value={filters.groupBy}
              onChange={(v) => updateFilter({ groupBy: v })}
              style={{ width: 120 }}
              placeholder={t("no_grouping")}
            >
              <Option value="">{t("no_grouping")}</Option>
              <Option value="author">{t("author")}</Option>
              <Option value="source_url">{t("source")}</Option>
              <Option value="pdate">{t("date_desc")}</Option>
            </Select>
          </FilterItem>

          <FilterItem label={t("language")}>
            <RemoteFilterSelector
              multiple
              filters={filters}
              column="lang"
              onChange={(v) => updateFilter({ lang: v })}
              value={filters.lang}
              style={{ width: 100 }}
            />
          </FilterItem>

          {/* 快捷操作 */}
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {activeFiltersCount > 0 && (
              <Tag color="var(--primary)" style={{ margin: 0, padding: '2px 8px' }}>
                {t("filter_count", { count: activeFiltersCount })}
              </Tag>
            )}
            <Button
              type="text"
              size="small"
              onClick={handleReset}
              icon={<ClearOutlined style={{ fontSize: 12 }} />}
              style={{ color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {t("reset")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * 辅助组件：统一标签和输入框的排布
 */
export const FilterItem = ({ label, children }) => (
  <Space size={8} style={{ flexWrap: 'wrap' }}>
    <Text type="secondary" strong style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
      {label}:
    </Text>
    {children}
  </Space>
);
