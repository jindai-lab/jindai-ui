import { ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { message } from 'antd';
import yaml from 'js-yaml';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient as api } from '../api';
import YamlEditor from '../components/yaml-editor';

const initialNodes = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function Workflow({ }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [yamlContent, setYamlContent] = useState('');
  const [error, setError] = useState(null);
  const [source, setSource] = useState(true);
  const editorRef = useRef(null);
  const { taskId } = useParams()

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    fetchSource()
  }

  function handleValidate(data) {
    const validated = validateData(data)
    const undefFields = Object.keys(data).filter(x => typeof (validated[x]) === 'undefined').join(', ')
    if (undefFields) throw new Error('多余字段：' + undefFields)
    const { pipeline } = data
    if (!Array.isArray(pipeline) || pipeline.map(x => Array.isArray(x) && x.length == 2).filter(x => !x).length) throw new Error('Pipeline 应为数组，且各元素为长度为2的数组。')
  }

  function validateData(data) {
    let { name, pipeline, shared, resume_next, concurrent, shortcut_map } = data
    return { name, pipeline, shared, resume_next, concurrent, shortcut_map }
  }

  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const fetchSource = async () => {
    try {
      const data = await api.callAPI(`tasks/${taskId}`);
      const yaml_src = yaml.dump(validateData(data))
      setYamlContent(yaml_src);
      editorRef.current.setValue(yaml_src)
      setError(null);
    } catch (err) {
      console.error('获取配置失败:', err);
      setError('无法加载配置文件，请检查任务 ID 或网络连接。');
      message.error('加载失败');
    } finally {
    }
  }

  const handleSave = async (updatedYaml) => {
    const hide = message.loading('正在保存配置...', 0);
    try {
      let data = validateData(yaml.load(updatedYaml))
      await api.callAPI(`tasks/${taskId}`, data, { method: 'PUT' });
      message.success('配置更新成功');
      setYamlContent(updatedYaml); // 更新本地缓存的内容
    } catch (err) {
      console.error('保存失败:', err);
      message.error('保存失败，服务器返回错误');
    } finally {
      hide();
    }
  }

  return (
    <>
      {!source && (
        <div style={{ width: '100vw', height: '100vh', color: 'black' }}>
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
        <YamlEditor initialValue={yamlContent}
          onSave={handleSave}
          onMount={handleEditorDidMount}
          onValidate={handleValidate}
        />
      )}
    </>
  );
}