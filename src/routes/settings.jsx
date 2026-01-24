import { Card, Col, Row, Select, Checkbox } from "antd";
import { useEffect, useState } from "react";

export default function SettingsPage() {

  const [styleMode, setStyleMode] = useState('auto')
  const [viewPdfAsImage, setViewPdfAsImage] = useState(false)

  useEffect(() => {
    setStyleMode(localStorage.theme || '')
    setViewPdfAsImage(!!localStorage.viewPdfAsImage)
  })

  return (
    <>
    <Card title="外观设置">
      <Row>
        <Col span={3}>颜色模式</Col>
        <Col span={5}>
          <Select value={styleMode} onChange={(value) => {
            setStyleMode(value)
            localStorage.theme = value
            document.documentElement.className = value
          }} options={[
            {label: "自动", value: ""},
            {label: "浅色", value: "light"},
            {label: "深色", value: "dark"},
          ]}></Select>
        </Col>
      </Row>
      <Row>
        <Col span={3}>PDF 阅览器</Col>
        <Col span={5}>
          <Checkbox checked={viewPdfAsImage} onChange={(e) => {
            setViewPdfAsImage(e.target.checked)
            localStorage.viewPdfAsImage = e.target.checked ? 'true' : ''
          }}>使用服务器端图片渲染</Checkbox>
        </Col>
      </Row>
    </Card>
    </>
  );
}
