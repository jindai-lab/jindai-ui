import { Card, Col, Row, Select, Checkbox, Input } from "antd";
import { useEffect, useState } from "react";

export default function SettingsPage() {

  const [settings, setSettings] = useState({
    theme: 'auto',
    viewPdfAsImage: false,
    translatorLang: '简体中文',
    translatorZhipuApiKey: ''
  })

  useEffect(() => {
    const localSettings = {}
    const converter = {
      'object': x => x,
      "string": x => x,
      "boolean": x => Boolean(x),
      "number": x => +x      
    }
    Object.keys(settings).forEach(key => {
      if (key in localStorage)
        localSettings[key] = (converter[typeof settings[key]])(window.localStorage[key])
      else
        localSettings[key] = settings[key]
    })
    setSettings(localSettings)
  }, [])

  const updateSettings = (update) => {
    setSettings({ ...settings, ...update })
    Object.entries(update).forEach(([key, value]) => window.localStorage[key] = value)
  }

  return (
    <>
      <Card title="外观设置">
        <Row>
          <Col span={3}>颜色模式</Col>
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
          <Col span={3}>PDF 阅览器</Col>
          <Col span={5}>
            <Checkbox checked={Boolean(settings.viewPdfAsImage)} onChange={(e) => {
              updateSettings({ viewPdfAsImage: e.target.checked })
            }}>使用服务器端图片渲染</Checkbox>
          </Col>
        </Row>
        <Row>
          <Col span={3}>自动翻译</Col>
          <Col span={5}>
            <Row>
              自动将文本翻译为：
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
