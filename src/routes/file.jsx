import {
  FolderOpenOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { InputNumber } from "antd";
import { Suspense, lazy, useEffect, useState } from "react";
import { ThreeDots } from "react-loader-spinner";
import { Document, Page, pdfjs } from "react-pdf";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiClient as api } from "../api";

const FileListPage = lazy(() => import("./filelist.jsx"));

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const SinglePagePDFViewer = ({ fileUrl, pdfWidth }) => {
  const pageNumber = 1; // Always display the first page
  pdfWidth = pdfWidth || 800;
  return (
    <div className="pdf-single-page-viewer">
      <Document file={fileUrl} loading={<CustomDocumentLoader />}>
        <Page pageNumber={pageNumber} width={pdfWidth} />
      </Document>
    </div>
  );
};

const CustomDocumentLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100px",
    }}
  >
    <ThreeDots color="var(--primary)" height={50} width={50} />
  </div>
);

const PdfViewer = ({ path, asImage }) => {
  const [params, setParams] = useSearchParams();
  const [pdfPage, setPdfPage] = useState(+(params.get("page") || "1"));
  const [pdfMaxPages, setPdfMaxPages] = useState(0);
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    api
      .callAPI(`files/${encodeURIComponent(path)}?metadata=true`)
      .then((data) => {
        setPdfMaxPages(data.page_count);

        document.onkeydown = function (e) {
          switch (e.key) {
            case "ArrowLeft":
            case "a":
              setPdfPage((prev) => prev - 1 || prev);
              break;
            case "ArrowRight":
            case "d":
              setPdfPage((prev) =>
                prev < data.page_count ? prev + 1 : data.page_count,
              );
              break;
          }
        };
      });

    document.title = `查看文件 - ${path}`;
  }, [path]);

  useEffect(() => {
    const srcUrl = `files/${encodeURIComponent(path)}?page=${pdfPage - 1}&format=${asImage ? 'png' : ''}`;
    console.log(pdfPage, srcUrl);
    api.download(srcUrl).then(setBlobUrl);
    if (pdfPage != +params.get("page")) {
      params.set("page", pdfPage);
      setParams(params);
    }
  }, [path, pdfPage, asImage]);

  return (
    <>
      <div className="file-info">
        <span>/{path}</span>
        <span className="pagenum">
          <InputNumber
            value={pdfPage}
            onChange={setPdfPage}
            min={1}
            max={pdfMaxPages}
          />
        </span>
      </div>
      {!!blobUrl && (
        <div className="pdf-viewer">
          <LeftOutlined
            onClick={() => pdfPage > 1 && setPdfPage(pdfPage - 1)}
            disabled={pdfPage <= 1}
          />
          {asImage && (
            <img
              src={blobUrl}
              width={
                document.getElementsByClassName("pdf-viewer")[0]
                  ?.clientWidth - 80
              }
              height="auto"
            />
          )}
          {!asImage && (
            <SinglePagePDFViewer
              fileUrl={blobUrl}
              width={
                document.getElementsByClassName("single-page-pdf-viewer")[0]
                  ?.clientWidth
              }
            />
          )}
          <RightOutlined
            onClick={() => pdfPage < pdfMaxPages && setPdfPage(pdfPage + 1)}
            disabled={pdfPage >= pdfMaxPages}
          />
        </div>
      )}
    </>
  );
};

function FileViewer({ path }) {
  const ext = path.split(".").pop().toLowerCase();
  const [blobUrl, setBlobUrl] = useState("");
  useEffect(() => {
    api.download(`files/${path}`).then(setBlobUrl);
  }, [path]);
  switch (ext) {
    case "pdf":
      return <PdfViewer path={path} asImage={!!localStorage.viewPdfAsImage} />;
    case "txt":
    case "html":
    case "htm":
      return (
        <div>
          <h2>文件预览 - {path}</h2>
          <iframe
            title={path}
            src={blobUrl}
            style={{ width: "100%", height: "80vh", border: "none" }}
          />
        </div>
      );
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "bmp":
    case "webp":
      return (
        <div>
          <h2>图片预览 - {path}</h2>
          <img
            src={blobUrl}
            alt={path}
            style={{ maxWidth: "100%", maxHeight: "80vh" }}
          />
        </div>
      );
    default:
      return (
        <div>
          <h2>无法预览该文件类型</h2>
          <p>如需下载该文件，请点击以下链接：</p>
          <a
            href="#"
            onClick={() =>
              api
                .download(`files/${encodeURIComponent(path)}`)
                .then((url) => {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = path.split('/').pop()
                  link.click();
                  link.remove();
                })
            }
          >
            下载 {path}
          </a>
        </div>
      );
  }
}

export default function FilePage() {
  const { "*": path } = useParams();
  if (!path || path.endsWith("/")) {
    return (
      <Suspense>
        <FileListPage folderPath={path || ""} />
      </Suspense>
    );
  } else {
    return (
      <>
        <Link to={"/files/" + path.split("/").slice(0, -1).join("/") + "/"}>
          <FolderOpenOutlined /> 返回上级目录
        </Link>
        <FileViewer path={path} />
      </>
    );
  }
}
