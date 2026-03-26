import { message, Form, Button, Space, Tabs, Input, Switch, InputNumber } from "antd";
import { PlayCircleOutlined, CodeOutlined, FormOutlined, SettingOutlined } from "@ant-design/icons";
import yaml from "js-yaml";
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api";
import ParamPanel from "../components/param-panel";
import PipelineVisual from "../components/pipeline-visual";
import PipelineYaml from "../components/pipeline-yaml";
import { useTranslation } from "react-i18next";

export default function Workflow({ }) {
  const { t } = useTranslation();
  const { taskId } = useParams();
  const editorRef = useRef(null);
  const [shortcutMap, setShortcutMap] = useState(null);
  const [yamlContent, setYamlContent] = useState("");
  const [pipelineSchema, setPipelineSchema] = useState([]);
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('workflow_view_mode');
    return saved || 'settings';
  });
  const [pipelineData, setPipelineData] = useState([]);
  const [workflowConfig, setWorkflowConfig] = useState({
    name: '',
    shared: false,
    resume_next: true,
    concurrent: 3,
    shortcut_map: {}
  });
  const [form] = Form.useForm();

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem('workflow_view_mode', viewMode);
  }, [viewMode]);

  // Load data on mount
  useEffect(() => {
    (async function () {
      const schema = await fetchPipelineSchema();
      setPipelineSchema(schema);
      const data = await fetchSource();
      if (data) {
        // Extract workflow config
        setWorkflowConfig({
          name: data.name || '',
          shared: data.shared !== undefined ? data.shared : false,
          resume_next: data.resume_next !== undefined ? data.resume_next : true,
          concurrent: data.concurrent || 3,
          shortcut_map: data.shortcut_map || {}
        });
        
        // Extract pipeline data
        const pipeline = data.pipeline || [];
        setPipelineData(pipeline);
        setYamlContent(yaml.dump(pipeline));
        
        // Set form values
        form.setFieldsValue({
          name: data.name || '',
          shared: data.shared !== undefined ? data.shared : false,
          resume_next: data.resume_next !== undefined ? data.resume_next : true,
          concurrent: data.concurrent || 3
        });
        
        // Build shortcuts if shortcut_map exists
        if (data.shortcut_map) {
          try {
            setShortcutMap(buildShortcuts(data.shortcut_map, pipeline));
          } catch (err) {
            console.log("Shortcut build error:", err);
          }
        }
      }
    })();
  }, []);

  const fetchPipelineSchema = async () => {
    const schemaData = await apiClient.getPipelines();

    const flattened = [];

    // Iterate through categories (e.g., Sentiment Analysis)
    for (const category in schemaData) {
      const components = schemaData[category];

      // Iterate through components in that category (e.g., AutoSentimentAnalysis)
      for (const componentKey in components) {
        const component = components[componentKey];

        // Create a Snippet for the YAML body
        // This creates:
        // ComponentName:
        //   arg1: default
        let snippet = ` ${component.name}:\n`;
        component.args.forEach((arg, index) => {
          const defaultValue = arg.default !== null ? arg.default : " ";
          // ${index + 1} creates tab stops for the user
          snippet += `    ${arg.name}: \${${index + 1}:${defaultValue}}\n`;
        });

        flattened.push({
          label: component.name,
          documentation: {
            value: `**Category:** ${category}\n\n${component.doc}`,
          },
          insertText: snippet,
          detail: category.split("\n")[0], // Shows the first line of category as detail
          args: component.args,
          category,
        });
      }
    }
    return flattened;
  }

  const fetchSource = async () => {
    try {
      const data = await apiClient.taskDBO(taskId);
      return data;
    } catch (err) {
      console.error(t("get_config_failed"), err);
      message.error(t("cannot_load_config_file_check_task_id_or_network"));
      return null;
    }
  };

  // Sync YAML content when pipeline changes (visual tab)
  const handlePipelineChange = (newPipeline) => {
    setPipelineData(newPipeline);
    setYamlContent(yaml.dump(newPipeline));
  };

  // Sync pipeline data when YAML changes (source code tab)
  const handleYamlChange = (parsedPipeline) => {
    setPipelineData(parsedPipeline);
  };

  // Save handler - saves entire taskdbo
  const handleSave = async (data) => {
    const hide = message.loading(t("saving_configuration"), 0);
    try {
      await apiClient.taskDBO(taskId, data);
      message.success(t("configuration_updated_successfully"));
    } catch (err) {
      console.error(t("save_failed"), err);
      message.error(t("save_failed_server_error"));
    } finally {
      hide();
    }
  };

  // Handle settings form submit
  const handleSaveSettings = async (values) => {
    const data = {
      name: values.name,
      shared: values.shared,
      resume_next: values.resume_next,
      concurrent: values.concurrent,
      shortcut_map: workflowConfig.shortcut_map || {},
      pipeline: pipelineData
    };
    await handleSave(data);
    setWorkflowConfig({
      ...workflowConfig,
      name: values.name,
      shared: values.shared,
      resume_next: values.resume_next,
      concurrent: values.concurrent
    });
  };

  // Handle shortcut map update
  const handleShortcutMapChange = (newShortcutMap) => {
    setWorkflowConfig({
      ...workflowConfig,
      shortcut_map: newShortcutMap
    });
  };

  // Build shortcuts from shortcut_map and pipeline
  const findShrotcutKey = (key, context, setval) => {
    const schema = pipelineSchema;
    const segs = key.split('.');
    let contextType = ''
    for (let seg of segs) {
      if (context == null || context === undefined) throw new Error(`处理 ${key} 时出错`);
      if (Array.isArray(context)) {
        // current seg should represent a specific pipeline stage
        let [_, stageName, __, index] = seg.match(/(.+?)(@(\d+))?$/) || ['', '', '', +seg + 1]
        index = index ? index - 1 : 0;
        if (stageName) {
          context = context.filter(x => !!x[stageName])
        }
        context = context[index];
        contextType = Object.keys(context || {})[0];
      }
      else if (typeof context === 'object') {
        // current seg should represent a set of params
        const arg = schema.filter(x => x.label == contextType)[0]?.args.filter(x => x.name == seg)[0] || {};
        context = context[contextType]
        if (setval !== undefined) {
          context[seg] = setval
          context = setval
        } else {
          context = context[seg] || arg.default?.replace(/^["']|['"]$/g, '') || null;
        }
        contextType = arg.type?.toLowerCase() || '';
      }
    }
    return [context, contextType]
  }

  const buildShortcuts = (stale_shortcut_map, pipeline) => {
    const vEntries = Object.entries(stale_shortcut_map).map(([key, name]) => [name, findShrotcutKey(key, pipeline)])
    const value = Object.fromEntries(vEntries.map(([key, [val, type]]) => [key, val]))
    const scheme = Object.fromEntries(vEntries.map(([key, [val, type]]) => [key, type]))
    return { value, scheme }
  }

  const updateShortcuts = async () => {
    const data = {
      name: workflowConfig.name,
      shared: workflowConfig.shared,
      resume_next: workflowConfig.resume_next,
      concurrent: workflowConfig.concurrent,
      shortcut_map: workflowConfig.shortcut_map,
      pipeline: pipelineData
    };
    await handleSave(data);
  }

  return (
    <>
      <Tabs
        activeKey={viewMode}
        onChange={(key) => setViewMode(key)}
        items={[
          {
            key: 'settings',
            label: (
              <Space>
                <SettingOutlined />
                {t("settings")}
              </Space>
            ),
            children: (
              <Form
                form={form}
                layout="vertical"
                style={{ maxWidth: 600 }}
                onFinish={handleSaveSettings}
                preserveFields
              >
                <Form.Item
                  name="name"
                  label={t("task_name")}
                  rules={[{ required: true, message: t("Please enter task name") }]}
                >
                  <Input placeholder={t("e_g_my_task")} />
                </Form.Item>

                <Form.Item
                  name="concurrent"
                  label={t("concurrency")}
                  rules={[{ required: true, message: t("Please enter concurrency") }]}
                >
                  <InputNumber 
                    min={1} 
                    max={100} 
                    style={{ width: '100%' }} 
                    placeholder={t("e_g_3")} 
                  />
                </Form.Item>

                <Form.Item
                  name="resume_next"
                  label={t("resume_next")}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  name="shared"
                  label={t("shared")}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    {t("save")}
                  </Button>
                </Form.Item>
              </Form>
            )
          },
          {
            key: 'pipeline',
            label: (
              <Space>
                <FormOutlined />
                {t("pipeline")}
              </Space>
            ),
            children: (
              <PipelineVisual
                value={pipelineData}
                pipelineSchema={pipelineSchema}
                onChange={handlePipelineChange}
                onSyncYaml={(newPipeline) => {
                  setYamlContent(yaml.dump(newPipeline));
                }}
              />
            )
          },
          {
            key: 'yaml',
            label: (
              <Space>
                <CodeOutlined />
                {t("source_code")}
              </Space>
            ),
            children: (
              <PipelineYaml
                initialValue={yamlContent}
                onChange={handleYamlChange}
                onSave={(yamlStr) => {
                  try {
                    const parsed = yaml.load(yamlStr);
                    const data = {
                      name: workflowConfig.name,
                      shared: workflowConfig.shared,
                      resume_next: workflowConfig.resume_next,
                      concurrent: workflowConfig.concurrent,
                      shortcut_map: workflowConfig.shortcut_map,
                      pipeline: parsed
                    };
                    handleSave(data);
                  } catch (err) {
                    console.error("YAML save error:", err);
                  }
                }}
              />
            )
          },
        ]}
        style={{ marginTop: 16 }}
      />
      
      {/* Shortcut Panel */}
      {shortcutMap && (
        <Form style={{ marginTop: 16 }}>
          <ParamPanel 
            scheme={shortcutMap.scheme || {}} 
            value={shortcutMap.value || {}}
            onChange={handleShortcutMapChange}
          />
          <Button type="primary" onClick={updateShortcuts}>{t("update")}</Button>
          <Space></Space>
          <Button 
            icon={<PlayCircleOutlined />} 
            onClick={async () => {
              await updateShortcuts()
              const jobId = await apiClient.workerSubmitTask('custom', { task_id: taskId })
              message.info(`已提交任务 ${jobId}`)
            }}
          >
            {t("run")}
          </Button>
        </Form>
      )}
    </>
  );
}
