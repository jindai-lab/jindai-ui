import { message } from "antd";
import axios from "axios";
import localeCodes from "locale-codes";
import dayjs from "dayjs";

class InterceptorsError extends Error {}

class SmartStorage {
  constructor(prefix = "jindai_local_config") {
    this._prefix = prefix;
  }

  // Generate a unique key like "app_theme" or "app_volume"
  _getStoreKey(prop) {
    return `${this._prefix}_${String(prop)}`;
  }

  static create(prefix) {
    const instance = new SmartStorage(prefix);

    return new Proxy(instance, {
      get(target, prop) {
        // Allow access to class methods/internal props
        if (prop in target) return target[prop];

        const value = localStorage.getItem(target._getStoreKey(prop));
        try {
          return JSON.parse(value);
        } catch {
          return value; // Return as string if not JSON
        }
      },

      set(target, prop, value) {
        const key = target._getStoreKey(prop);
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      },

      deleteProperty(target, prop) {
        localStorage.removeItem(target._getStoreKey(prop));
        return true;
      },
    });
  }
}

export const apiClient = Object.assign(
  axios.create({
    baseURL: "/api/v2",
  }),
  {
    bearer: "",
    async makeCall(name, data = null, { method, ...options } = { method: "" }) {
      try {
        if (!this.interceptors.request.handlers.filter((x) => x).length)
          throw new InterceptorsError();

        name = name.replace(/^\/+/g, "");
        if (!method) method = data ? "POST" : "GET";
        method = method.toUpperCase();

        if (data?.id) {
          name += data.id;
          data.id = undefined;
          if (Object.entries(data).length == 0) data = null;
        }

        switch (method) {
          case "GET":
          case "DELETE":
            if (data) {
              const params = new URLSearchParams();
              for (var [key, val] of Object.entries(data))
                params.append(key, val);
              name += "?" + params.toString();
              data = null;
            }
            break;
          case "PUT":
          case "POST":
            break;
          default:
            throw new Error(`Invalid "data" for method ${method}`);
        }

        const resp = await this[method.toLowerCase()](name, data);
        return resp?.data;
      } catch (e) {
        if (e instanceof InterceptorsError) return;
        message.error(`错误的请求: ${e}`);
        console.error(e, { name, data, method });
      }
    },
    // search paragraphs
    async search(options) {
      return await this.makeCall(`paragraphs/search`, options);
    },
    async fileSources(folderPath = "", search = "") {
      folderPath = folderPath || "";
      folderPath = folderPath.replace(/^\/*/, "/");
      const files = await this.makeCall(
        `files${folderPath}`,
        { search },
        { method: "GET" },
      );
      return files;
    },
    async getColumnFilters(column, filters) {
      const resp = await apiClient.makeCall(
        `paragraphs/filters/${column}`,
        filters,
      );
      return resp.map(({ value, count }) => ({
        label: `${value} (${count})`,
        value,
      }));
    },
    // datasets
    async datasets() {
      return (await this.makeCall("datasets"))?.results;
    },
    async datasetRename({ id = "", original = "", newName }) {
      return await this.makeCall(`datasets/${id}`, { name: newName });
    },
    async datasetCreate({ name }) {
      return await this.makeCall(`datasets`, { name });
    },
    async datasetSort(sortedNames) {
      this.makeCall("datasets", {
        batch: sortedNames.map((x, i) => ({
          name: x,
          order_weight: i,
        })),
      });
    },
    // file operations
    async download(src) {
      const resp = await this.get(src, { responseType: "blob" });
      const href = URL.createObjectURL(resp.data);
      return { blob: resp.data, url: href };
    },
    async fileRename({ original, newName, newPath }) {
      return await this.makeCall(`files/${original}`, {
        name: newName || null,
        path: newPath || null,
      });
    },
    async createFolder(folderPath, folderName) {
      return await this.makeCall(`files/${folderPath}`, {
        name: folderName.trim(),
        is_directory: true,
      });
    },
    async deleteFile(path) {
      return await this.makeCall(`files/${path}`, null, { method: "DELETE" });
    },
    async listFiles(folderPath) {
      const data = await this.makeCall(
        `files/${encodeURI(folderPath)}?metadata=true`,
      );
      const list = data.items || [];
      list.sort((a, b) => {
        if (a.is_directory && !b.is_directory) return -1;
        if (!a.is_directory && b.is_directory) return 1;
        return a.name.localeCompare(b.name);
      });
      return list;
    },
    async getFileMetadata(path) {
      const data = await this.makeCall(
        `files/${encodeURI(path)}?metadata=true`,
      );
      return data;
    },
    // tasks & worker
    async workerSubmitTask(type, params) {
      return await this.makeCall(`worker/${type}`, params);
    },
    async workerStats() {
      return await this.makeCall("worker/");
    },
    async workerJobsList() {
      return await this.makeCall("worker/jobs");
    },
    async workerClearJobs() {
      return await this.makeCall("worker/", null, { method: "DELETE" });
    },
    async workerJob(jobId) {
      return await this.makeCall(`worker/${jobId}`);
    },
    async workerJobDelete(jobId) {
      return await this.makeCall(`worker/${jobId}`, null, { method: "DELETE" });
    },
    async embeddingStats() {
      return await this.makeCall("embeddings/");
    },
    async taskTypes() {
      return await this.makeCall("worker/tasks")
    },
    async taskDBO(id = "", updated = null) {
      return await this.makeCall(`tasks/${id}`, updated, {
        method: updated ? "PUT" : "GET",
      });
    },
    // pipeline
    async getPipelines() {
      return await this.makeCall('plugins/pipeline')
    },
    // histories
    async histories() {
      return await this.makeCall('histories/')
    },
    // other
    langCodes: Object.entries(
      Object.fromEntries([
        ["auto", "自动"],
        ["zhs", "简体中文"],
        ["zht", "繁体中文"],
        ...localeCodes.all.map((lang) => [lang["iso639-1"], lang.name]),
      ]),
    ).map(([code, name]) => ({
      label: name,
      value: code,
    })),
    formatIsoToDateTime(isoString) {
      if (!isoString || !dayjs(isoString).isValid()) {
        return "-"; // 空值/无效值兜底
      }
      return dayjs(isoString).format("YYYY-MM-DD HH:mm:ss");
    },
    localConfig: SmartStorage.create(),
  },
);
