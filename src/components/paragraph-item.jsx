import React, { useEffect, useState } from 'react';
import { Button, Modal, Typography, Space } from 'antd';
import { TableOutlined, TranslationOutlined } from '@ant-design/icons'
import { apiClient } from '../api';

const { Title, Text } = Typography;

// 搜索结果项组件
const ParagraphItem = ({ data }) => {
  // 控制元数据弹窗显示/隐藏的状态
  const [metadataVisible, setMetadataVisible] = useState(false);
  const [translatedText, setTranslatedText] = useState('');

  const FIELD_NAMES = {
    keywords: '关键词',
    pdate: '日期',
    author: '作者',
    outline: '大纲',
    content: '内容',
    dataset: '数据集',
    source_url: '出处',
    source_page: '页号',
    pagenum: '页码',
    lang: '语言',
    extdata: '额外数据',
    id: 'ID',
    dataset_name: '数据集名称',
    count: '计数'
  }

  const formatValue = (value) => {
    let displayValue = value ?? '无数据';
    // 处理数组类型
    if (Array.isArray(displayValue)) {
      displayValue = displayValue.map(x => formatValue(x)).join(', ')
    }
    // 处理对象类型，转为JSON字符串展示
    if (typeof displayValue === 'object' && displayValue !== null) {
      displayValue = JSON.stringify(displayValue, null, 2);
    }
    // 处理布尔值
    if (typeof displayValue === 'boolean') {
      displayValue = displayValue ? '是' : '否';
    }
    return displayValue;
  }

  // 格式化元数据展示（处理空值、对象等情况）
  const formatMetadata = (data) => {
    return Object.entries(data).filter(([key, _]) => FIELD_NAMES[key]).sort((a, b) => (FIELD_NAMES[a] || '').localeCompare(FIELD_NAMES[b])).map(([key, value], index) => {
      // 处理空值
      // 处理数组
      const displayValue = formatValue(value)

      return (
        <div key={index} style={{
          padding: '8px 0',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '4px'
        }}>
          <Text strong style={{ width: '120px', display: 'inline-block' }}>
            {FIELD_NAMES[key] || key}
          </Text>
          <Text>{displayValue}</Text>
        </div>
      );
    });
  };

  useEffect(() => {
    (async () => {
      const languageIdentify = (lang1, lang2) => {
        lang1 = lang1.split('-')[0].substring(0, 2); lang2 = lang2.split('-')[0].substring(0, 2);
        return lang1 == lang2;
      }
      if (apiClient.localConfig.translatorLang && !languageIdentify(data.lang, apiClient.localConfig.translatorLang) && 'Translator' in window) {
        try {
          console.log('init translator')
          const translator = await Translator.create({
            sourceLanguage: data.lang.substring(0, 2),
            targetLanguage: apiClient.localConfig.translatorLang,
          });
          setTranslatedText(await translator.translate(data.content))
        } catch (err) {
          console.error(err)
        }
      } else {
        console.debug('Translator not available')
      }
    })();
  }, [data])

  return (
    <div className="result" key={data.id}>
      {/* 操作按钮区域 - 新增查看元数据按钮 */}

      {/* 原有元数据展示区域 */}
      <div className="metadata-section">
        <div className="metadata-item">
          <span className="metadata-label">{FIELD_NAMES.dataset}</span>
          <span className="metadata-value" data-id={data.dataset}>{data.dataset_name || ''}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">{FIELD_NAMES.source_url}</span>
          <span className="metadata-value">
            <a href={data.href} target='_blank' rel="noopener noreferrer">
              {data.source_url || ''}
              {data.pagenum ? `:${data.pagenum}` : ''}
            </a>
          </span>
        </div>
        {data.outline && (
          <div className="metadata-item">
            <span className="metadata-label">{FIELD_NAMES.outline}</span>
            <span className="metadata-value">{data.outline || ''}</span>
          </div>
        )}
        {data.author && (
          <div className="metadata-item">
            <span className="metadata-label">{FIELD_NAMES.author}</span>
            <span className="metadata-value">{data.author}</span>
          </div>
        )}
        {data.pdate && (
          <div className="metadata-item">
            <span className="metadata-label">日期</span>
            <span className="metadata-value">{data.pdate}</span>
          </div>
        )}
        <div className="" style={{ display: 'none' }}>{data.id}</div>
      </div>

      {/* 文本内容区域 */}
      <div className="text-content" lang={data.lang}>
        {data.content || '无文本内容'}
      </div>

      {translatedText && (<div className="text-content text-translated" lang={apiClient.localConfig.translatorLang}>
        <TranslationOutlined /><hr style={{ border: 'none' }} />
        {translatedText}
      </div>)}

      <div style={{ marginBottom: '8px' }}>
        <Button
          type="text"
          size="small"
          onClick={() => setMetadataVisible(true)}
          icon={<TableOutlined />}
          color='var(--text)'
        >
          元数据
        </Button>
      </div>
      {/* 元数据弹窗 - 新增 */}
      <Modal
        title={<Title level={5}>【{data.id}】完整元数据</Title>}
        open={metadataVisible}
        onCancel={() => setMetadataVisible(false)}
        footer={[
          <Button key="close" onClick={() => setMetadataVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
        destroyOnHidden={true}
      >
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {formatMetadata(data).length > 0 ? (
            formatMetadata(data)
          ) : (
            <Text type="secondary">暂无元数据信息</Text>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ParagraphItem;