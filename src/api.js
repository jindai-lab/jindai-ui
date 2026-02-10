import { message } from "antd";
import axios from "axios";
import localeCodes from "locale-codes";
import dayjs from 'dayjs';

class InterceptorsError extends Error { }


class SmartStorage {
  constructor(prefix = 'jindai_local_config') {
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
      }
    });
  }
}


export const apiClient = Object.assign(
  axios.create({
    baseURL: "/api/v2", // Your Flask Backend
  }),
  {
    bearer: "",
    async callAPI(name, data = null, { method, ...options } = { method: "" }) {
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
              for (var [key, val] of Object.entries(data)) params.append(key, val);
              name += '?' + params.toString();
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
    async search(options) {
      return await this.callAPI(`paragraphs/search`, options);
    },
    async datasets() {
      return (await this.callAPI("datasets"))?.results;
    },
    async download(src) {
      const resp = await this.get(src, { responseType: "blob" });
      const href = URL.createObjectURL(resp.data);
      return { blob: resp.data, url: href }
    },
    async fileSources(folderPath = "", search = "") {
      folderPath = folderPath || "";
      folderPath = folderPath.replace(/^\/*/, "/");
      const files = await this.callAPI(
        `files${folderPath}`,
        { search },
        { method: "GET" },
      );
      return files;
    },
    async fileRename({ original, newName, newPath }) {
      return await this.callAPI(`files/${original}`, {
        name: newName || null,
        path: newPath || null,
      });
    },
    async datasetRename({ id = "", original = "", newName }) {
      return await this.callAPI(`datasets/${id}`, { name: newName });
    },
    async datasetCreate({ name }) {
      return await this.callAPI(`datasets`, { name });
    },
    async datasetSort(sortedNames) {
      this.callAPI("datasets", {
        batch: sortedNames.map((x, i) => ({
          name: x,
          order_weight: i,
        })),
      });
    },
    async newJob({ type, dataset, source, lang = "auto" }) {
      switch (type) {
        case "import":
          if (!dataset || !source || !lang) {
            message.error("数据集和文件源均不能为空");
            return;
          }
          break;

        default:
          message.error(`未知的任务类型 ${type}`);
          return;
      }
      this.callAPI("worker", {
        task_type: type,
        params: {
          source,
          dataset,
          lang,
        },
      });
    },
    localeCodes: Object.entries(
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
        return '-'; // 空值/无效值兜底
      }
      return dayjs(isoString).format('YYYY-MM-DD HH:mm:ss');
    },
    localConfig: SmartStorage.create()
  },
);
