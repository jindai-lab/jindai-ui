import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { message } from "antd";
import yaml from "js-yaml";
import { useCallback, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api";
import YamlEditor from "../components/yaml-editor";

const initialNodes = [
  { id: "n1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "n2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];
const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

export default function Workflow({}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [yamlContent, setYamlContent] = useState("");
  const [source, setSource] = useState(true);
  const editorRef = useRef(null);
  const { taskId } = useParams();

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    fetchSource();
  }

  function handleValidate(data) {
    const validated = validateData(data);
    const undefFields = Object.keys(data)
      .filter((x) => typeof validated[x] === "undefined")
      .join(", ");
    if (undefFields) throw new Error("多余字段：" + undefFields);
    const { pipeline } = data;
    if (
      !Array.isArray(pipeline) ||
      pipeline.map((x) => Object.entries(x).length == 1).filter((x) => !x)
        .length
    )
      throw new Error("Pipeline 应为数组，且各元素为一个对象。");
  }

  function validateData(data) {
    let { name, pipeline, shared, resume_next, concurrent, shortcut_map } =
      data;
    pipeline = pipeline.map((x) => {
      if (Array.isArray(x) && x.length == 2)
        return {
          [x[0]]: x[1],
        };
      else return x;
    });
    return { name, pipeline, shared, resume_next, concurrent, shortcut_map };
  }

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const handleEditorWillMount = async (monaco) => {
    const schemaData = await apiClient.getPipelines();
    const suggestions = [];

    // 1. Iterate through categories (e.g., Sentiment Analysis)
    for (const category in schemaData) {
      const components = schemaData[category];

      // 2. Iterate through components in that category (e.g., AutoSentimentAnalysis)
      for (const componentKey in components) {
        const component = components[componentKey];

        // 3. Create a Snippet for the YAML body
        // This creates:
        // ComponentName:
        //   arg1: default
        let snippet = ` ${component.name}:\n`;
        component.args.forEach((arg, index) => {
          const defaultValue = arg.default !== null ? arg.default : " ";
          // ${index + 1} creates tab stops for the user
          snippet += `    ${arg.name}: \${${index + 1}:${defaultValue}}\n`;
        });

        suggestions.push({
          label: component.name,
          kind: monaco.languages.CompletionItemKind.Class,
          documentation: {
            value: `**Category:** ${category}\n\n${component.doc}`,
          },
          insertText: snippet,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: category.split("\n")[0], // Shows the first line of category as detail
        });
      }
    }

    monaco.languages.registerCompletionItemProvider("*", {
      provideCompletionItems: (model, position) => {
        return { suggestions };
      },
      triggerCharacters: ['-']
    });
  };

  const fetchSource = async () => {
    try {
      const data = await apiClient.taskDBO(taskId);
      const yaml_src = yaml.dump(validateData(data));
      setYamlContent(yaml_src);
      editorRef.current.setValue(yaml_src);
    } catch (err) {
      console.error("获取配置失败:", err);
      message.error("无法加载配置文件，请检查任务 ID 或网络连接。");
    } finally {
    }
  };

  const handleSave = async (updatedYaml) => {
    const hide = message.loading("正在保存配置...", 0);
    try {
      let data = validateData(yaml.load(updatedYaml));
      await apiClient.taskDBO(taskId, data);
      message.success("配置更新成功");
      setYamlContent(updatedYaml); // 更新本地缓存的内容
    } catch (err) {
      console.error("保存失败:", err);
      message.error("保存失败，服务器返回错误");
    } finally {
      hide();
    }
  };

  return (
    <>
      {!source && (
        <div style={{ width: "100vw", height: "100vh", color: "black" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          />
        </div>
      )}
      {source && (
        <YamlEditor
          initialValue={yamlContent}
          onSave={handleSave}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          onValidate={handleValidate}
        />
      )}
    </>
  );
}
