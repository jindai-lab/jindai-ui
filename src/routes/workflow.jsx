import { message, Form, Button, Space } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import yaml from "js-yaml";
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api";
import ParamPanel from "../components/param-panel";
import YamlEditor from "../components/yaml-editor";
import { useTranslation } from "react-i18next";

export default function Workflow({ }) {
const { t } = useTranslation();
  const { taskId } = useParams();
  const editorRef = useRef(null);
  const [shortcutMap, setShortcutMap] = useState(null);
  const [yamlContent, setYamlContent] = useState("");
  const [pipelineSchema, setPipelineSchema] = useState([]);

  const handleValidate = (data) => {
    const validated = validateData(data);
    const undefFields = Object.keys(data)
      .filter((x) => typeof validated[x] === "undefined")
      .join(", ");
    if (undefFields) throw new Error(t("extra_fields") + undefFields);
    const { pipeline } = data;
    if (
      !Array.isArray(pipeline) ||
      pipeline.map((x) => Object.entries(x).length == 1).filter((x) => !x)
        .length
    )
      throw new Error(t("pipeline_should_be_array_with_objects"));
  }

  const validateData = (data, schema) => {
    let { name, pipeline, shared, resume_next, concurrent, shortcut_map } =
      data;
    pipeline = pipeline.map((x) => {
      if (Array.isArray(x) && x.length == 2)
        return {
          [x[0]]: x[1],
        };
      else return x;
    });
    try {
      setShortcutMap(buildShortcuts(shortcut_map, pipeline))
    } catch (err) {
      console.log(err)
      throw new Error(t("shortcut_error") + err)
    }
    return { name, pipeline, shared, resume_next, concurrent, shortcut_map };
  }

  useEffect(() => {
    (async function () {
      const schema = await fetchPipelineSchema();
      setPipelineSchema(schema);
      const data = await fetchSource();
      if (data) {
        const validated = validateData(data, schema);
        setYamlContent(yaml.dump(validated.pipeline))
      }
    })();
  }
    , []
  )

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
          args: component.args
        });
      }
    }
    return flattened;
  }

  const fetchSource = async () => {
    try {
      const data = await apiClient.taskDBO(taskId);
      const yaml_src = yaml.dump(validateData(data, pipelineSchema));
      setYamlContent(yaml_src);
    } catch (err) {
      console.error(t("get_config_failed"), err);
      message.error(t("cannot_load_config_file_check_task_id_or_network"));
    } finally {
    }
  };

  const handleSave = async (updatedYaml) => {
    const hide = message.loading(t("saving_configuration"), 0);
    try {
      let data = validateData(yaml.load(updatedYaml));
      await apiClient.taskDBO(taskId, data);
      message.success(t("configuration_updated_successfully"));
      setYamlContent(updatedYaml); // 更新本地缓存的内容
    } catch (err) {
      console.error(t("save_failed"), err);
      message.error(t("save_failed_server_error"));
    } finally {
      hide();
    }
  };

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
    const data = yaml.load(yamlContent)
    Object.entries(shortcutMap.value).forEach(([name, val]) => {
      const key = Object.entries(data.shortcut_map).filter(([k, n]) => n == name)[0]?.[0]
      findShrotcutKey(key, data.pipeline, val)
    })
    const yaml_src = yaml.dump(data)
    setYamlContent(yaml_src);
    await handleSave(yaml_src)
  }

  return (
    <>
      {(<YamlEditor
        initialValue={yamlContent}
        onSave={handleSave}
        onValidate={handleValidate}
      />)}
      {(shortcutMap && <Form>
        <ParamPanel scheme={shortcutMap.scheme || {}} value={shortcutMap.value || {}}
          onChange={e => {
            setShortcutMap({
              scheme: shortcutMap.scheme,
              value: e
            })
          }} />
        <Button type="primary" onClick={updateShortcuts}>更新</Button><Space></Space>
        <Button icon={<PlayCircleOutlined />} onClick={async () => {
          await updateShortcuts()
          const jobId = await apiClient.workerSubmitTask('custom', { task_id: taskId })
          message.info(`已提交任务 ${jobId}`)
        }}>运行</Button>
      </Form>)}
    </>
  );
}
