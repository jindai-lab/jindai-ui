import axios from "axios";
import Cookies from "js-cookie";
import i18n from "./locales/";
import EventSource from "eventsource"

const _prompt_no_image = require("../public/assets/no-image.png");
const _prompt_video = require("../public/assets/video.png");

const apiBase = "/api/";
var _token = localStorage.token || "";
Cookies.set("token", _token, { domain: '.' + location.hostname });

function LocalConfig() {
  // Local Config Object

  let defaults = {
    fit: "both",
    drawer: true,
    contain: false,
    enhance: false,
    force_thumbnail: false,
    playing_interval: 1000,
    view_mode: "list",
    page_size: 50,
    tagging: {
      batch_delim: ", ",
      batch_prefix: "*",
    },
    dbconsole: {
      mongocollection: 'paragraph',
      history: []
    },
    groups: "none",
    sort: "id",
    expert: false,
    multiple_image_domains: true
  };

  function _save_config(target) {
    localStorage["local_config"] = JSON.stringify(target);
  }

  function _load_config() {
    return JSON.parse(localStorage["local_config"] || "{}");
  }

  let handler = {
    get(target, name) {
      var val = target[name] || "";
      switch (typeof defaults[name]) {
        case "number":
          return +val;
        case "boolean":
          return val === true;
      }
      return val;
    },
    set(target, name, val) {
      switch (typeof defaults[name]) {
        case "number":
          val = +val;
          break;
        case "boolean":
          val = "" + val == "true";
          break;
      }
      target[name] = val;
      _save_config(target);
      return true;
    },
  };

  return new Proxy(Object.assign({ save() { _save_config(this) } }, defaults, _load_config()), handler);
}

const _stack = {
  _list: [],
  get_loading_bar() {
    return document.getElementById('loadingBar') ?? { style: {} }
  },
  push(val) {
    this._list.push(val)
    this.get_loading_bar().style.opacity = 1
  },
  pop() {
    if (this._list.length > 0) this._list.pop()
    if (this._list.length == 0)
      this.get_loading_bar().style.opacity = 0
  }
};

const apis = {
  stack: _stack,

  locale: "zhs",

  user: "",

  apiBase,

  meta: {},

  querystring_parse(str) {
    var params = {};
    for (var pair of new URLSearchParams(str).entries()) {
      if (pair[1].startsWith("JSON__")) pair[1] = JSON.parse(pair[1].slice(6));
      else if (pair[1].match(/^\d+$/)) pair[1] = +pair[1];
      else if (pair[1].match(/^(true|false)$/)) pair[1] = pair[1] == "true";
      params[pair[0]] = pair[1];
    }
    return params;
  },

  querystring_stringify(obj) {
    var str = "";
    for (var k in obj) {
      let o = obj[k];
      str += `&${k}=`;
      switch (typeof o) {
        case "object":
          str += "JSON__" + encodeURIComponent(JSON.stringify(o));
          break;
        case "string":
          str += encodeURIComponent(o);
          break;
        default:
          str += o;
          break;
      }
    }
    if (str === "") return "";
    return "?" + str.substring(1);
  },

  blob_download(blob, filename) {
    var url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    setTimeout(() => {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(url);
      link.remove();
    }, 100);
  },

  cancel_source() {
    return axios.CancelToken.source();
  },

  _catch_and_then(promise) {
    function DataError(message, stack) {
      this.name = "DataError";
      this.message = message;
      this.stack = stack;
    }
    DataError.prototype = Object.create(Error.prototype);
    DataError.prototype.constructor = DataError;

    return promise
      .then((resp) => {
        _stack.pop();
        if (resp.data.__exception__) {
          throw new DataError(
            resp.data.__exception__,
            resp.data.__tracestack__.join("\n")
          );
        } else {
          return resp.data;
        }
      })
      .catch((ex) => {
        console.log(ex)
        _stack.pop()

        var message = ex.toString()
        if (typeof ex.message === "string") {
          message = ex.message;
          if (message.match("code 502")) message = "backend-disconnected";
          else if (message.match("Forbidden.")) {
            localStorage.token = "";
            message = "forbidden";
            if (!location.href.endsWith("/login")) location.href = "/login";
          } else if (message.match("Unmatched credentials"))
            message = "unmatched-credentials";
        }

        if (message !== "Cancel") {
          this.dialogs.notify(message, { detail: typeof ex != 'object' ? { '@val': ex } : ex });
          throw ex;
        }
      });
  },

  _axios_config(other) {
    return {
      headers: {
        "X-Authentication-Token": _token,
        "X-Preferred-Language": i18n.locale,
      },
      ...(other || {})
    }
  },

  upload(file, data, progress_handler) {
    return this._catch_and_then(
      axios.put(
        this.apiBase + "storage/" + file,
        data,
        this._axios_config({
          onUploadProgress: progress_handler
        })
      )
    )
  },

  log_out() {
    return axios.delete(`${this.apiBase}authenticate`).then(() => {
      location.reload();
    });
  },

  escape_regex(x) {
    return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  querify(obj) {
    function _debracket(x) {
      if (x.match(/^\(.*\)$/)) {
        var stack = 0;
        for (var c of x.substr(1, x.length - 2)) {
          switch (c) {
            case "(":
              ++stack;
              break;
            case ")":
              if (stack) --stack;
              else return x;
              break;
            case ",":
            case "|":
              return x;
          }
        }
        if (stack == 0) return x.substr(1, x.length - 2);
      }
      return x;
    }

    if (Array.isArray(obj)) {
      if (obj.length == 0) return "[]";
      else if (obj.length == 1) {
        return "[" + _debracket(this.querify(obj[0])) + "]";
      } else {
        return (
          "[" + obj.map((x) => _debracket(this.querify(x))).join(",") + "]"
        );
      }
    }

    if (obj === null || obj === undefined) {
      return "null";
    }

    if (typeof obj == "object") {
      var s = "";
      for (var kvpair of Object.entries(obj)) {
        let key = kvpair[0],
          val = kvpair[1];
        switch (key) {
          case "$and":
            s +=
              ",(" +
              val.map((x) => _debracket(this.querify(x))).join(",") +
              ")";
            break;
          case "$or":
            s +=
              ",(" +
              val.map((x) => _debracket(this.querify(x))).join("|") +
              ")";
            break;
          case "$options":
            break;
          case "$regex":
            s += "%" + this.querify(val);
            break;
          default:
            if (key.startsWith("$"))
              s +=
                "," + key.substr(1) + "(" + _debracket(this.querify(val)) + ")";
            else {
              s += "," + key;
              val = this.querify(val);
              if (val.startsWith("(%")) {
                s += val.substr(1, val.length - 2);
              } else {
                s += "=" + val;
              }
            }
            break;
        }
      }
      return "(" + _debracket(s.replace(/^,/, "")) + ")";
    }

    return JSON.stringify(obj);
  },

  authenticate(username, password, otp, remember) {

    const _get_user = () => new Promise((resolve, reject) => {
      this.call("authenticate")
        .then((d) => {
          this.user = d.result.username;
          resolve(d);
        })
        .catch(reject);
    });

    if (typeof otp == "string") otp = otp.substring(0, 6)

    if (typeof username == 'string') return new Promise((resolve, reject) => {
      this.call("authenticate", {
        username,
        password,
        otp,
      }).then((data) => {
        if (data) {
          localStorage.token = _token = data.result;
          Cookies.set(
            "token",
            _token,
            remember ?
              {
                expires: 30,
              } :
              undefined
          );
          resolve(data)
          _get_user();
        } else {
          reject(data);
        }
      });
    });
    else return _get_user()
  },

  is_logined() {
    return !!_token;
  },

  call(name, params, cancel = null) {
    _stack.push(name);
    if (typeof params !== "undefined")
      return this._catch_and_then(
        axios.post(
          apiBase + name,
          params,
          this._axios_config(
            cancel ?
              {
                cancelToken: cancel.token,
              } :
              {}
          )
        )
      );
    else
      return this._catch_and_then(
        axios.get(
          apiBase + name,
          this._axios_config(
            cancel ?
              {
                cancelToken: cancel.token,
              } :
              {}
          )
        )
      );
  },

  delete(name, params) {
    _stack.push(name);
    if (typeof params !== "undefined")
      return this._catch_and_then(
        axios.delete(apiBase + name, params, this._axios_config())
      );
    else
      return this._catch_and_then(
        axios.delete(apiBase + name, this._axios_config())
      );
  },

  put(name, params) {
    _stack.push(name);
    return this._catch_and_then(
      axios.put(apiBase + name, params, this._axios_config())
    );
  },

  cut_words(str) {
    return this.call("quicktask", {
      pipeline: [
        [
          "WordCut",
          {
            lang: "auto",
            content: str,
          },
        ],
      ],
    });
  },

  open_window(url) {
    if (typeof url === "object") url = "/" + this.querystring_stringify(url);
    window.open(url);
  },

  queue() {
    return this.call("queue/")
      .then((data) => data.result)
      .catch(() => { });
  },

  fav(r) {
    const key = "favored:" + this.user;
    var bundle = {
      keywords: key,
    };
    if (this.favored(r)) {
      r.keywords = r.keywords.filter((x) => x != key);
      bundle = {
        $pull: bundle,
      };
    } else {
      r.keywords.push(key);
      bundle = {
        $push: bundle,
      };
    }
    return this.call(
      `collections/${r.mongocollection || "paragraph"}/${r._id}`,
      bundle
    );
  },

  favored(r) {
    return r.keywords.includes("favored:" + this.user);
  },

  get_datasets() {
    function _segs(x) {
      var r = [],
        s = "";
      for (var seg of x.name.split("--")) {
        s += seg;
        r.push(s);
        s += "--";
      }
      return r;
    }

    return this.call("datasets").then((data) => {
      var weights = {},
        colls = data.result.sort((x) => x.order_weight);
      for (var c of colls) {
        for (var s of _segs(c))
          if (!weights[s]) weights[s] = c.order_weight;
      }

      function _comp(x, y) {
        var s1 = _segs(x),
          s2 = _segs(y);
        for (var si = 0; si < s1.length && si < s2.length; ++si) {
          let xx = s1[si],
            yy = s2[si];
          if (weights[xx] !== weights[yy]) return weights[xx] - weights[yy];
        }
        return x.name.localeCompare(y.name);
      }

      return colls.sort(_comp);
    });
  },

  get_datasets_hierarchy() {
    var bundles = {};
    return this.get_datasets().then((data) => {
      var hierarchy = {
        id: "ROOT",
        name: "",
        children: [],
      };

      data = data.map((x) => {
        x.segments = (x.display_name || x.name).split("--");
        x.level = x.segments.length;
        return x;
      });

      for (var x of data) {
        var parent_obj = hierarchy;
        for (
          var i = 0, segs = x.segments[0]; i < x.level; i++, segs += "--" + x.segments[i]
        ) {
          var cand = parent_obj.children.filter((child) => child.id == segs)[0];
          if (typeof cand === "undefined") {
            cand = {
              id: segs,
              label: x.segments[i],
              children: [],
            };
            bundles[cand.id] = {
              name: segs,
              dataset_name: x.name,
              mongocollection: x.mongocollection,
            };
            parent_obj.children.push(cand);
          }
          parent_obj = cand;
        }
      }

      return {
        hierarchy: hierarchy.children,
        bundles: bundles,
      };
    });
  },

  quote(s) {
    s = s || "";
    if (s.match(/[`'"()\s.&,+%:/]|(^\d+(\.\d+)?$)/))
      return "`" + s.replace(/`/g, "\\`") + "`";
    if (s === "") s = "''";
    return s;
  },

  _generate_domain(path, prefix, delimiter) {
    const host_name_regex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;

    const simpleHash = str => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Convert to 32bit integer
      }
      return new Uint32Array([hash])[0].toString(36);
    };

    if (this.config.multiple_image_domains && location.hostname.match(host_name_regex))
      return `//${prefix}-` + simpleHash(path) + delimiter + location.host;

    return ''
  },

  get_image_url(src) {
    var path = ''
    if (src.file.indexOf('://') >= 0) {
      let ext = (src.url || src.orig_path || '').split('.').pop()
      let segs = src.file.split('://')
      path = `/images/${segs[0]}/${segs[1].replace('$', src.block_id) || src.block_id}/image.${ext.length <= 4 ? ext : 'data'}`
    }
    else if (src.file.match(/\.pdf$/) && typeof (src.page) !== 'undefined')
      path = `/images/file/${src.file}__hash/pdf/${src.page}/page.png`
    else if (src.file)
      path = `/images/file/${src.file}`
    else if (src.url)
      path = src.url
    else
      path = `/images/object/${Buffer.from(JSON.stringify(src)).toString('base64')}`;

    return this._generate_domain(path, 'img', this.meta.domain_delimiter) + path;
  },

  async get_meta() {
    if (!this.meta.app_title) {
      let meta = await this.call('meta').then(data => data.result)
      this.meta = meta
    }
    return this.meta
  },

  get_item_image(item, disable_args) {
    let config = this.config;

    if (!item || !item.source || (!item.source.url && !item.source.file))
      return _prompt_no_image;

    var args = "";
    if (item && item.item_type == "video") {
      if (item.thumbnail)
        return this.get_image_url({ file: item.thumbnail, url: '.jpg' });
      return _prompt_video;
    }

    if (!disable_args) {
      if (config.force_thumbnail) args += "__hash/thumbnail/1280";
      // if (config.enhance) args += "&enhance=1";
    }

    if (item.source.file) {
      if (item.source.file.indexOf('://') >= 0) item.source.block_id = item._id;
      return this.get_image_url(item.source) + args;
    }
    return item.source.url;
  },

  get_item_video(item) {
    if (item.source.file) {
      if (item.source.file.indexOf('://') >= 0) item.source.block_id = item._id;
      return this.get_image_url(item.source);
    }
    return item.source.url;
  },

  get_paragraph_image(paragraph) {
    if (paragraph.images && paragraph.images.length)
      return this.get_item_image(paragraph.images[0]);
    if (
      paragraph.source &&
      paragraph.source.file &&
      paragraph.source.file.endsWith(".pdf")
    )
      return this.get_item_image(paragraph);

    return _prompt_no_image;
  },

  scope(paragraph) {
    if (paragraph.author)
      return 'author=' + JSON.stringify(paragraph.author);
    if (Array.isArray(paragraph.keywords)) {
      var ats = paragraph.keywords.filter(x => x.startsWith('@'))
      if (ats.length) return JSON.stringify(ats[0])
      var groups = paragraph.keywords.filter(x => x.startsWith('#'))
      if (groups.length) return JSON.stringify(groups[0])
    }
    if (paragraph._id)
      return 'id=o"' + paragraph._id + '"';
    return '';
  },

  guess_groups(cond) {
    var words = []
    if (Array.isArray(cond)) {
      for (var paragraph of cond) {
        if (!words.length) words = Array.from(paragraph.keywords);
        else words = words.filter(x => paragraph.keywords.includes(x))
      }
    } else {
      words = cond.match(/([_\w\u4e00-\u9fa5]+)/g) || []
    }
    return words.filter(x => x.length && !x.match(/^@/))
  },

  get_group(paragraph) {
    if (paragraph.gid) {
      return paragraph.gid;
    }
    if (paragraph.group_id) {
      return `${paragraph.group_field}=${JSON.stringify(paragraph.group_id)}`;
    }
    return `id=o"${paragraph._id}"`
  },

  get_event_source() {
    var es = new EventSource("/api/queue/events", this._axios_config())
    return es
  },

  current_q() {
    return this.querystring_parse(location.search).q || "";
  },

  next_fit() {
    const fits = ["both", "width", "height"];
    return fits[(fits.indexOf(this.config.fit) + 1) % fits.length]
  },

  config: LocalConfig(),

};

export default apis