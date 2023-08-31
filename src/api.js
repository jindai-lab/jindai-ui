import axios from "axios";
import Cookies from "js-cookie";
import i18n from "./locales/";

const _prompt_no_image = require("../public/assets/no-image.png");
const _prompt_video = require("../public/assets/video.png");

const apiBase = location.origin + "/api/";
var _token = localStorage.token || "";

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
      batch_delim: ",",
      batch_prefix: "",
    },
    font_size: 16,
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
          var data = resp.data;
          if (typeof data.success !== 'undefined') {
            if (!data.success)
              throw new DataError('Operation Failure')
            else
              return data.bundle
          }
          return data
        }
      })
      .catch((ex) => {
        console.log(ex)
        _stack.pop()

        var message = ex.toString()
        if (typeof ex.message === "string") {
          message = ex.message;
          if (message.match("code 502")) message = "backend-disconnected";
          else if (message.match(/forbidden|403/i)) {
            localStorage.token = "";
            message = "forbidden";
            if (!location.pathname.endsWith("/login")) location.href = "/login?target=" + encodeURIComponent(location.href);
          } else if (message.match("Unmatched credentials"))
            message = "unmatched-credentials";
        }

        if (message !== "Cancel") {
          this.notify(message, { detail: typeof ex != 'object' ? { '@val': ex } : ex });
          throw ex;
        }
      });
  },

  _axios_config(other = {}) {
    return {
      headers: {
        "X-Authentication-Token": _token,
        "X-Preferred-Language": i18n.locale,
      },
      ...other
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

    function _debracket(expression) {
      if (!expression.match(/^\(.+\)$/)) return expression
      const subexpr = expression.substring(1, expression.length - 1)
      var brackets = 0
      for (var char of subexpr) {
        if (char == '(') brackets++;
        else if (char == ')') {
          brackets--;
          if (brackets < 0)
            return expression
        }
      }
      return subexpr;
    }

    function _normalize_pipeline(pipeline) {
      return pipeline.map(([stage, params]) => {
        var o = {}
        o['$' + stage] = params
        return o
      })
    }

    if (Array.isArray(obj)) {
      if (obj.filter(x => Array.isArray(x) && x.length == 2 && typeof x[0] == 'string' && typeof x[1] == 'object' && !Array.isArray(x[1])).length == obj.length)
        obj = _normalize_pipeline(obj)

      if (obj.filter(x => Object.keys(x).length == 1 && Object.keys(x)[0].startsWith('$')).length == obj.length)
        return obj.map(x => this.querify(x)).map(x => x + (x.endsWith('}') ? '' : ';')).join('\n');

      return `[${obj.map(x => this.querify(x)).join(', ')}]`;
    }

    if (obj instanceof Date) {
      const year = obj.getFullYear();
      const month = String(obj.getMonth() + 1).padStart(2, '0');
      const day = String(obj.getDate()).padStart(2, '0');
      const hours = String(obj.getHours()).padStart(2, '0');
      const minutes = String(obj.getMinutes()).padStart(2, '0');
      const seconds = String(obj.getSeconds()).padStart(2, '0');

      return `d"${year}-${month}-${day} ${hours}:${minutes}:${seconds}"`;
    }

    if (obj === null || typeof obj == 'undefined') {
      return "null";
    }

    if (typeof obj == "object") {

      const dollars = Object.keys(obj).filter(x => x.startsWith('$'))

      if (!dollars.length)
        return '(' + Object.entries(obj).map(([key, value]) => {
          value = this.querify(value)
          if (typeof value == 'string')
            return `${key}=${value}`
          else
            return `${key}${value.value}`
        }).join(', ') + ')'

      if (obj.$regex) {
        const regex = obj.$regex;
        const options = obj.$options || '';
        return { value: ` % \`${regex}\`${options}` };
      }

      var conds = obj.$and || obj.$or
      if (conds) {
        const andor = dollars[0] == '$and' ? ' & ' : ' | '
        return `(${conds.map(x => this.querify(x)).join(andor)})`
      }

      const oper = dollars[0].substring(1), value = obj[dollars[0]]

      const rel_oper = {
        'eq': '=',
        'ne': '!=',
        'lt': '<',
        'lte': '<=',
        'gt': '>',
        'gte': '>=',
        'subtract': '-',
        'add': '+',
        'multiply': '*',
        'divide': '/',
      }

      if (typeof rel_oper[oper] == 'string') {
        if (Array.isArray(value))
          return `(${this.querify(value[0])} ${rel_oper[oper]} ${this.querify(value[1])})`
        return {
          value: ` ${rel_oper[oper]} ${this.querify(value)}`
        }
      }

      switch (oper) {
        case 'addFields':
          return Object.entries(value).map(([target, expr]) => `${target} := ${expr}`).join(', ')
        case 'Condition':
          return `if (${value.cond}) {
            ${this.querify(value.iftrue)}
          } else {
            ${this.querify(value.iffalse)}
          }`.replace(/^\s+/gm, '')
        case 'RepeatWhile':
          return `repeat (${value.cond || ('$$itercounter < ' + value.times)}) {
            ${this.querify(value.pipeline)}
          }`.replace(/^\s+/gm, '')
        default:
          var args = ', '

          if (value.pipeline) {
            args = 'pipeline={' + this.querify(value.pipeline) + '}, ';
            delete value.pipeline;
          }

          if (Array.isArray(value))
            args += value.map(x => _debracket(this.querify(x))).join(', ')
          else if (Object.keys(value).length > 0)
            args += _debracket(this.querify(value))
          return `${oper}(${args.replace(/, $|^, /, '')})`
      }
    }

    if (typeof obj == "string") {
      if (obj.match(/^\$\w+$|^\w+\.\w+$/))
        return obj;
      return JSON.stringify(obj)
    }

    // numbers, booleans
    return JSON.stringify(obj);
  },

  authenticate(username, password, otp, remember) {

    const _get_user = () => new Promise((resolve, reject) => {
      this.call("authenticate")
        .then((d) => {
          Cookies.set("token", _token,
            remember ? { expires: 30, } : undefined
          );
          Cookies.set("token", _token, { domain: '.' + location.hostname });
          this.user = d.username;
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
          localStorage.token = _token = data.token;
          resolve(data)
          _get_user();
        } else {
          reject(data);
        }
      }).catch(() => reject({}));
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
      .then(data => data.results)
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
      `collections/${r.mongocollection || "paragraph"}:${r._id}`,
      bundle
    );
  },

  favored(r) {
    return r.keywords.includes("favored:" + this.user);
  },

  quote(s) {
    s = s || "";
    if (s.match(/[`'"()\s.&,+%:/]|(^\d+(\.\d+)?$)/))
      return "`" + s.replace(/`/g, "\\`") + "`";
    if (s === "") s = "''";
    return s;
  },

  _generate_domain(path, prefix, delimiter) {
    const host_name_regex = /^((\w|\w[a-zA-Z0-9-]*\w)\.)*(\w|\w\w*\w)$/;

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
      return `//${prefix}-${simpleHash(path)}${delimiter}${location.host}`;

    return ''
  },

  get_image_url(path) {
    return this._generate_domain(path, 'img', this.meta.domain_delimiter) + path;
  },

  async get_meta() {
    if (!this.meta.app_title) {
      let meta = await this.call('meta')
      Object.assign(this.meta, meta)
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
        return this.get_image_url('/images/' + item.thumbnail);
      return _prompt_video;
    }

    if (!disable_args) {
      if (config.force_thumbnail) args += "__hash/thumbnail/1280";
      // if (config.enhance) args += "&enhance=1";
    }

    if (item.source.file) {
      if (item.source.file.indexOf('://') >= 0) item.source.block_id = item._id;
      return this.get_image_url(item.src) + args;
    }
    return item.source.url;
  },

  get_item_video(item) {
    if (item.source.file) {
      if (item.source.file.indexOf('://') >= 0) item.source.block_id = item._id;
      return this.get_image_url(item.src);
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
    if (typeof cond == 'string') return cond.match(/([_\w\u4e00-\u9fa5]+)/g) || []
    else if (Array.isArray(cond) && cond.length) {
      var existent_groups = new Set()
      var words = [...cond[0].keywords]
      for (var paragraph of cond) {
        for (var group of paragraph.keywords.filter(x => x.startsWith('#'))) existent_groups.add(group.substring(1))
        if (!words.length) words = Array.from(paragraph.keywords);
        else words = words.filter(x => paragraph.keywords.includes(x))
      }
      return Array.from(new Set(words.map(x => x.replace(/^@/, '')).concat(...Array.from(existent_groups)))).sort()
    }
    else
      return []
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
    var es = new EventSource(apiBase + "queue/events")
    return es
  },

  current_q() {
    return this.querystring_parse(location.search).q || "";
  },

  next_fit() {
    const fits = ["both", "width", "height"];
    return fits[(fits.indexOf(this.config.fit) + 1) % fits.length]
  },

  emphasize(content, pattern) {
    if (!pattern || pattern == '()') return content;
    content = content.normalize('NFD');
    return content.replace(new RegExp(pattern, 'ig'), '<em>$1</em>').normalize('NFC')
  },

  copy_to_clipboard(text) {
    const testingCodeToCopy = document.querySelector("#testing-code");
    testingCodeToCopy.setAttribute("type", "text");
    testingCodeToCopy.setAttribute("value", text);
    testingCodeToCopy.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      alert("Oops, unable to copy");
    }
    testingCodeToCopy.setAttribute("type", "hidden");
    window.getSelection().removeAllRanges();
  },

  config: LocalConfig(),

};

export default apis
