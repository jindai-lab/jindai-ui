import { Card, Col, Row, Select, Checkbox, Input, Divider, Space } from "antd";
import { useEffect, useState, useContext } from "react";
import { apiClient } from "../api";
import { ThemeContext } from "../main";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();
  const themeContext = useContext(ThemeContext);

  const [settings, setSettings] = useState({
    theme: 'auto',
    viewPdfAsImage: false,
    translatorLang: t("简体中文"),
    translatorZhipuApiKey: '',
    language: 'zh-CN'
  })

  useEffect(() => {
    setSettings(apiClient.localConfig)
  }, [])

  const updateSettings = (update) => {
    setSettings({ ...settings, ...update })
    Object.entries(update).forEach(([key, value]) => apiClient.localConfig[key] = value)
    
    // 如果主题设置改变，更新全局主题
    if (update.theme && themeContext) {
      themeContext.setTheme(update.theme)
    }
    
    // 如果语言设置改变，更新 i18n 语言
    if (update.language) {
      localStorage.setItem('jindai-language', update.language);
      // Note: react-i18next will automatically pick up the change via the i18n instance
    }
  }

  return (
    <>
      <Card title={t("界面设置")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Row>
          <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("界面语言")}</Col>
          <Col span={8}>
            <Select 
              value={settings.language} 
              style={{ width: 160 }}
              onChange={(value) => {
                updateSettings({ language: value })
              }} 
              options={[
                { label: "简体中文", value: "zh-CN" },
                { label: "English", value: "en" },
              ]}></Select>
          </Col>
        </Row>
      </Card>

      <Card title={t("外观设置")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("颜色模式")}</Col>
            <Col span={8}>
              <Select 
                value={settings.theme} 
                style={{ width: 140 }}
                onChange={(value) => {
                  updateSettings({ theme: value })
                }} 
                options={[
                  { label: t("自动"), value: "auto" },
                  { label: t("浅色"), value: "light" },
                  { label: t("深色"), value: "dark" },
                ]}></Select>
            </Col>
          </Row>
          <Divider style={{ margin: "8px 0" }} />
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("显示设置")}</Col>
            <Col span={8}>
              <Checkbox checked={Boolean(settings.viewPdfAsImage)} onChange={(e) => {
                updateSettings({ viewPdfAsImage: e.target.checked })
              }}>{t("使用服务器端图片渲染 PDF")}</Checkbox>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card title={t("自动翻译")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("自动将文本翻译为")}</Col>
            <Col span={8}>
              <Select 
                value={settings.translatorLang} 
                onChange={e => updateSettings({ translatorLang: e })} 
                style={{ width: 160 }} 
                options={[
                  { label: t("简体中文"), value: "zh-CN" },
                  { label: "English", value: "en" },
                  { label: t("不翻译"), value: "" }
                ]}></Select>
            </Col>
          </Row>
          <Divider style={{ margin: "8px 0" }} />
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>智谱 API Key</Col>
            <Col span={12}>
              <Input 
                value={settings.translatorZhipuApiKey} 
                onChange={e => updateSettings({ translatorZhipuApiKey: e.target.value })}
                placeholder="请输入智谱 AI API Key"
                style={{ width: 320 }}
                type="password"
              />
            </Col>
          </Row>
        </Space>
      </Card>
    </>
  );
}
