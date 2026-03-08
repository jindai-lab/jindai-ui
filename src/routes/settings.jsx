import { Card, Col, Row, Select, Checkbox, Input, Divider, Space, Button } from "antd";
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api";
import { ThemeContext } from "../main";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const themeContext = useContext(ThemeContext);

  const [settings, setSettings] = useState({
    theme: 'auto',
    viewPdfAsImage: false,
    translatorLang: t("simplified_chinese"),
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
      <Card title={t("interface_settings")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Row>
          <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("interface_language")}</Col>
          <Col span={8}>
            <Select 
              value={settings.language} 
              style={{ width: 160 }}
              onChange={(value) => {
                updateSettings({ language: value })
              }} 
              options={[
                { label: t("simplified_chinese"), value: "zh-CN" },
                { label: t("english"), value: "en" },
              ]}></Select>
          </Col>
        </Row>
      </Card>

      <Card title={t("appearance_settings")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("color_mode")}</Col>
            <Col span={8}>
              <Select 
                value={settings.theme} 
                style={{ width: 140 }}
                onChange={(value) => {
                  updateSettings({ theme: value })
                }} 
                options={[
                  { label: t("auto"), value: "auto" },
                  { label: t("light"), value: "light" },
                  { label: t("dark"), value: "dark" },
                ]}></Select>
            </Col>
          </Row>
          <Divider style={{ margin: "8px 0" }} />
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("display_settings")}</Col>
            <Col span={8}>
              <Checkbox checked={Boolean(settings.viewPdfAsImage)} onChange={(e) => {
                updateSettings({ viewPdfAsImage: e.target.checked })
              }}>{t("use_server_side_pdf_rendering")}</Checkbox>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card title={t("auto_translate")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("auto_translate_to")}</Col>
            <Col span={8}>
              <Select 
                value={settings.translatorLang} 
                onChange={e => updateSettings({ translatorLang: e })} 
                style={{ width: 160 }} 
                options={[
                  { label: t("simplified_chinese"), value: "zh-CN" },
                  { label: t("english"), value: "en" },
                  { label: t("not_translate"), value: "" }
                ]}></Select>
            </Col>
          </Row>
          <Divider style={{ margin: "8px 0" }} />
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("zhipu_api_key")}</Col>
            <Col span={12}>
              <Input 
                value={settings.translatorZhipuApiKey} 
                onChange={e => updateSettings({ translatorZhipuApiKey: e.target.value })}
                placeholder={t("please_enter_new_name")}
                style={{ width: 320 }}
                type="password"
              />
            </Col>
          </Row>
        </Space>
      </Card>

      <Card title={t("api_key_management")} style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)", marginBottom: 16 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Row>
            <Col span={4} style={{ color: "var(--text)", fontWeight: 500 }}>{t("api_key")}</Col>
            <Col span={12}>
              <Button
                type="primary"
                onClick={() => navigate('/manageapikeys')}
              >
                {t("manage_api_keys")}
              </Button>
            </Col>
          </Row>
          <Row>
            <Col span={16}>
              <p style={{ color: "var(--text)", opacity: 0.7, fontSize: "0.9rem" }}>
                {t("create_and_manage_api_keys")}
              </p>
            </Col>
          </Row>
        </Space>
      </Card>
    </>
  );
}
