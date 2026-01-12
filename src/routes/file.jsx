import { FolderOpenOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { InputNumber } from 'antd';
import { useEffect, useState, Suspense, lazy } from "react";
import { ThreeDots } from 'react-loader-spinner';
import { Document, Page, pdfjs } from 'react-pdf';
import { Link, useParams } from "react-router-dom";
import { apiClient as api } from '../api';

const FileListPage = lazy(() => import("./filelist.jsx"));

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const SinglePagePDFViewer = ({ fileUrl, pdfWidth }) => {
  const pageNumber = 1; // Always display the first page
  pdfWidth = pdfWidth || 800;
  return (
    <div className="pdf-single-page-viewer">
      <Document
        file={fileUrl}
        loading={<CustomDocumentLoader />}
      >
        <Page pageNumber={pageNumber} width={pdfWidth} />
      </Document>
    </div>
  );
}

const CustomDocumentLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
    <ThreeDots color="var(--primary)" height={50} width={50} />
  </div>
)

const PdfViewer = ({ splat }) => {

  const [pdfPage, setPdfPage] = useState(+(new URLSearchParams(window.location.search).get('page') || '0') + 1);
  const [pdfMaxPages, setPdfMaxPages] = useState(0);
  const [blobUrl, setBlobUrl] = useState('')

  useEffect(() => {
    api.callAPI(`files/${encodeURIComponent(splat)}?metadata=true`)
      .then(data => {
        setPdfMaxPages(data.page_count);
      });
  }, [splat])
  useEffect(() => {
    const srcUrl = `files/${encodeURIComponent(splat)}?page=${pdfPage - 1}`
    api.download(srcUrl).then(setBlobUrl)

    document.title = `查看文件 - ${splat}`;
    document.onkeydown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setPdfPage(pdfPage > 1 ? pdfPage - 1 : 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setPdfPage(pdfPage < pdfMaxPages ? pdfPage + 1 : pdfMaxPages);
      }
    }
  }, [splat, pdfPage]);

  return (
    <>
      <div className="file-info"><span>/{splat}</span><span className="pagenum">
        <InputNumber value={pdfPage} onChange={setPdfPage} min={1} max={pdfMaxPages} />
      </span></div>
      {!!blobUrl && (
        <div className="pdf-viewer">
          <LeftOutlined onClick={() => pdfPage > 1 && setPdfPage(pdfPage - 1)} disabled={pdfPage <= 1} />
          <SinglePagePDFViewer fileUrl={blobUrl} width={document.getElementsByClassName('.single-page-pdf-viewer')[0]?.clientWidth} />
          <RightOutlined onClick={() => pdfPage < pdfMaxPages && setPdfPage(pdfPage + 1)} disabled={pdfPage >= pdfMaxPages} />
        </div>
      )}
    </>
  )
}

function FileViewer({ splat }) {
  const ext = splat.split('.').pop().toLowerCase();
  const [blobUrl, setBlobUrl] = useState('')
  useEffect(() => {
    api.download(`files/${splat}`).then(setBlobUrl)
  }, [splat])
  switch (ext) {
    case 'pdf':
      return <PdfViewer splat={splat} />;
    case 'txt':
    case 'html':
    case 'htm':
      return (
        <div>
          <h2>文件预览 - {splat}</h2>
          <iframe
            title={splat}
            src={blobUrl}
            style={{ width: '100%', height: '80vh', border: 'none' }}
          />
        </div>
      );
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'webp':
      return (
        <div>
          <h2>图片预览 - {splat}</h2>
          <img
            src={blobUrl}
            alt={splat}
            style={{ maxWidth: '100%', maxHeight: '80vh' }}
          />
        </div>
      );
    default:
      return (
        <div>
          <h2>无法预览该文件类型</h2>
          <p>如需下载该文件，请点击以下链接：</p>
          <a href={`/api/files/${encodeURIComponent(splat)}`} download>下载 {splat}</a>
        </div>
      );
  }
}

export default function FilePage() {
  const { "*": splat } = useParams();
  if (!splat || splat.endsWith('/')) {
    return <Suspense><FileListPage folderPath={splat || ''} /></Suspense>;
  } else {
    return (
      <>
        <Link to={'/files/' + splat.split('/').slice(0, -1).join('/') + '/'}><FolderOpenOutlined /> 返回上级目录</Link>
        <FileViewer splat={splat} />
      </>
    )
  }
}