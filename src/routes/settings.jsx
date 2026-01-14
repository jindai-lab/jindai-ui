import { Card, Col, Row, Select } from "antd";
import { useEffect, useState } from "react";

export default function SettingsPage() {

  const [styleMode, setStyleMode] = useState('auto') 
  useEffect(() => {
    setStyleMode(localStorage.theme || '')
  })

  return (
    <>
    <Card title="外观设置">
      <Row>
        <Col span={5}>颜色模式</Col>
        <Col span={3}>
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
    </Card>
    </>
  );
}
