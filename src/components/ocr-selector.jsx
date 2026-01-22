import { useState } from 'react';
import { Modal, Button, Select, Space, Input, Checkbox } from 'antd';

// 核心：OCR语言对照表（完全映射你提供的表格，包含所有字段）
const OCR_LANGUAGE_LIST = [
  { tesseractCode: 'eng', paddleCode: 'en', language: '英文' },
  { tesseractCode: 'chi_sim', paddleCode: 'ch', language: '简体中文' },
  { tesseractCode: 'chi_tra', paddleCode: 'chinese_cht', language: '繁体中文' },
  { tesseractCode: 'fra', paddleCode: 'fr', language: '法文' },
  { tesseractCode: 'deu', paddleCode: 'german', language: '德文' },
  { tesseractCode: 'spa', paddleCode: 'spanish', language: '西班牙文' },
  { tesseractCode: 'rus', paddleCode: 'ru', language: '俄文' },
  { tesseractCode: 'jpn', paddleCode: 'japan', language: '日文' },
  { tesseractCode: 'kor', paddleCode: 'korean', language: '韩文' },
  { tesseractCode: 'ara', paddleCode: 'ar', language: '阿拉伯文' },
  { tesseractCode: 'hin', paddleCode: 'hi', language: '印地文' },
  { tesseractCode: 'por', paddleCode: 'pt', language: '葡萄牙文' },
  { tesseractCode: 'ita', paddleCode: 'it', language: '意大利文' },
  { tesseractCode: 'tur', paddleCode: 'tr', language: '土耳其文' },
  { tesseractCode: 'vie', paddleCode: 'vi', language: '越南文' },
  { tesseractCode: 'tha', paddleCode: 'th', language: '泰文' },
];

// 默认选中：简体中文
const DEFAULT_SELECT = OCR_LANGUAGE_LIST.find(item => item.tesseractCode === 'chi_sim');

const OcrLanguageSelectModal = ({ submit, filename, ...props }) => {
  // 弹窗显隐状态
  const [modalVisible, setModalVisible] = useState(false);
  // 选中的语言项（绑定完整对象）
  const [selectedLang, setSelectedLang] = useState(DEFAULT_SELECT);
  const [monochrome, setMonochrome] = useState(true);
  const [newName, setNewName] = useState((filename.indexOf('.') > 0 ? filename.split('.').slice(0, -1).join('.') : filename) + '_ocred.pdf');

  // 切换选中的语言
  const handleLangChange = (value) => {
    const selectedItem = OCR_LANGUAGE_LIST.find(item => item.tesseractCode === value);
    if (selectedItem) {
      setSelectedLang(selectedItem);
    }
  };

  // 点击确定按钮-回调选中结果
  const handleOk = () => {
    const result = {
      tesseractCode: selectedLang.tesseractCode,
      paddleCode: selectedLang.paddleCode,
      language: selectedLang.language,
      newName,
      monochrome
    }
    submit(result)
    setModalVisible(false)
  };

  // 点击取消按钮
  const handleCancel = () => {
    setModalVisible(false);
  };

  return (
    <>
      {/* 打开弹窗的按钮 */}
      <Button onClick={() => setModalVisible(true)} {...props}>
        OCR
      </Button>

      {/* OCR语言选择弹窗核心组件 */}
      <Modal
        title="OCR 设置"
        open={modalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={420}
        centered // 弹窗垂直居中
      >
        <Space>语言
          <Select
            value={selectedLang.tesseractCode}
            onChange={handleLangChange}
            options={OCR_LANGUAGE_LIST.map((item) => ({
              label: item.language,
              value: item.tesseractCode
            }))}
            style={{ width: 120 }}
          ></Select>
        </Space>
        <br/>
        <Space>
          输出文件名
          <Input
            placeholder="请输入新名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </Space>
        <br/>
        <Space>
          转换为黑白两色
          <Checkbox checked={monochrome} onChange={e => setMonochrome(e.target.checked)}></Checkbox>
        </Space>
      </Modal>
    </>
  );
};

export default OcrLanguageSelectModal;