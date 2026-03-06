import { Card, Col, Row, Select, Checkbox, Input } from "antd";
import { useEffect, useState, useContext } from "react";
import { apiClient } from "../api";
import { ThemeContext } from "../main";

export default function SettingsPage() {
  const themeContext = useContext(ThemeContext);

  const [settings, setSettings] = useState({
    theme: 'auto',
    viewPdfAsImage: false,
    translatorLang: '简体中文',
    translatorZhipuApiKey: ''
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
  }

  return (
    <>
      <Card title="外观设置" style={{ background: "var(--panel-bg)", color: "var(--text)", borderColor: "var(--border)" }}>
        <Row>
          <Col span={3} style={{ color: "var(--text)" }}>颜色模式</Col>
          <Col span={5}>
            <Select value={settings.theme} style={{ width: 120 }}
              onChange={(value) => {
                updateSettings({ theme: value })
              }} options={[
                { label: "自动", value: "auto" },
                { label: "浅色", value: "light" },
                { label: "深色", value: "dark" },
              ]}></Select>
          </Col>
        </Row>
        <Row>
          <Col span={3} style={{ color: "var(--text)" }}>PDF 阅览器</Col>
          <Col span={5}>
            <Checkbox checked={Boolean(settings.viewPdfAsImage)} onChange={(e) => {
              updateSettings({ viewPdfAsImage: e.target.checked })
            }}>使用服务器端图片渲染</Checkbox>
          </Col>
        </Row>
        <Row>
          <Col span={3} style={{ color: "var(--text)" }}>自动翻译</Col>
          <Col span={5}>
            <Row>
              <span style={{ color: "var(--text)" }}>自动将文本翻译为：</span>
              <Select value={settings.translatorLang} onChange={e => updateSettings({ translatorLang: e })} style={{ width: 120 }} options={[
                { label: "简体中文", value: "zh-CN" },
                { label: "English", value: "en" },
                { label: "不翻译", value: "" }
              ]}></Select>
            </Row>
            {/* <Row>
              智谱 API Key: <Input value={settings.translatorZhipuApiKey} onChange={e => updateSettings({ translatorZhipuApiKey: e.target.value })}></Input>
            </Row> */}
          </Col>
        </Row>
      </Card>
    </>
  );
}
