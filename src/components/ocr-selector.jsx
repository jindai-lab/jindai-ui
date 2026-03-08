import { useState } from "react";
import { Modal, Button, Select, Space, Input, Checkbox } from "antd";
import { useTranslation } from "react-i18next";


const OcrLanguageSelectModal = ({ submit, filename, ...props }) => {
  const { t } = useTranslation();

  const OCR_LANGUAGE_LIST = [
    { tesseractCode: "eng", paddleCode: "en", language: t("english") },
    {
      tesseractCode: "chi_sim",
      paddleCode: "ch",
      language: t("simplified_chinese"),
    },
    {
      tesseractCode: "chi_tra",
      paddleCode: "chinese_cht",
      language: t("traditional_chinese"),
    },
    { tesseractCode: "fra", paddleCode: "fr", language: t("french") },
    { tesseractCode: "deu", paddleCode: "german", language: t("german") },
    { tesseractCode: "spa", paddleCode: "spanish", language: t("spanish") },
    { tesseractCode: "rus", paddleCode: "ru", language: t("russian") },
    { tesseractCode: "jpn", paddleCode: "japan", language: t("japanese") },
    { tesseractCode: "kor", paddleCode: "korean", language: t("korean") },
    { tesseractCode: "ara", paddleCode: "ar", language: t("arabic") },
    { tesseractCode: "hin", paddleCode: "hi", language: t("hindi") },
    { tesseractCode: "por", paddleCode: "pt", language: t("portuguese") },
    { tesseractCode: "ita", paddleCode: "it", language: t("italian") },
    { tesseractCode: "tur", paddleCode: "tr", language: t("turkish") },
    { tesseractCode: "vie", paddleCode: "vi", language: t("vietnamese") },
    { tesseractCode: "tha", paddleCode: "th", language: t("thai") },
  ];
  // 弹窗显隐状态

  const DEFAULT_SELECT = OCR_LANGUAGE_LIST.find(
    (item) => item.tesseractCode === "chi_sim",
  );
  
  const [modalVisible, setModalVisible] = useState(false);
  // 选中的语言项（绑定完整对象）
  const [selectedLang, setSelectedLang] = useState(DEFAULT_SELECT);
  const [monochrome, setMonochrome] = useState(true);
  const [newName, setNewName] = useState(
    (filename.indexOf(".") > 0
      ? filename.split(".").slice(0, -1).join(".")
      : filename) + "_ocred.pdf",
  );

  // 切换选中的语言
  const handleLangChange = (value) => {
    const selectedItem = OCR_LANGUAGE_LIST.find(
      (item) => item.tesseractCode === value,
    );
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
      monochrome,
    };
    submit(result);
    setModalVisible(false);
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
        <Space>
          语言
          <Select
            value={selectedLang.tesseractCode}
            onChange={handleLangChange}
            options={OCR_LANGUAGE_LIST.map((item) => ({
              label: item.language,
              value: item.tesseractCode,
            }))}
            style={{ width: 120 }}
          ></Select>
        </Space>
        <br />
        <Space>
          输出文件名
          <Input
            placeholder={t("please_enter_new_name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </Space>
        <br />
        <Space>
          转换为黑白两色
          <Checkbox
            checked={monochrome}
            onChange={(e) => setMonochrome(e.target.checked)}
          ></Checkbox>
        </Space>
      </Modal>
    </>
  );
};

export default OcrLanguageSelectModal;
