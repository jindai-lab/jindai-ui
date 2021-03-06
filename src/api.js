import axios from "axios";
import Vue from "vue";
import Cookies from "js-cookie";
import i18n from "./locales/";

const _prompt_no_image = require("../public/assets/no-image.png");
const _prompt_video = require("../public/assets/video.png");

const apiBase = "/api/";
const _stack = [];
var _token = localStorage.token || "";
Cookies.set("token", _token);

function LocalConfig() {
    // Local Config Object

    let defaults = {
        fit: "both",
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
        sort: "id",
    };

    function _save_config(target) {
        localStorage["local_config"] = JSON.stringify(target);
    }

    function _load_config() {
        return JSON.parse(localStorage["local_config"] || "{}");
    }

    let handler = {
        get(target, name) {
            return target[name] || "";
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

    return new Proxy(Object.assign({}, defaults, _load_config()), handler);
}

export default {
    stack: _stack,

    locale: "chs",

    bus: new Vue(),

    user: "",

    apiBase,

    notify(notice) {
        this.bus.$emit("alert", notice);
    },

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
                if (_stack.length > 0) {
                    _stack.pop();
                    this.bus.$emit("loading", _stack.length);
                }
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
                if (_stack.length > 0) {
                    _stack.pop();
                    this.bus.$emit("loading", _stack.length);
                }
                if (typeof ex.message === "string") {
                    ex = ex.message;
                    if (ex.match("code 502")) ex = "backend-disconnected";
                    else if (ex.match("Forbidden.")) {
                        localStorage.token = "";
                        ex = "forbidden";
                        if (!location.href.endsWith("/login")) location.href = "/login";
                    } else if (ex.match("Unmatched credentials"))
                        ex = "unmatched-credentials";
                }

                if (ex.toString() !== "Cancel") {
                    this.notify(ex);
                    throw ex;
                }
            });
    },

    _axios_config(other) {
        if (!this.locale) this.locale = i18n.locale;
        return Object.assign({
                headers: {
                    "X-Authentication-Token": _token,
                    "X-Preferred-Language": this.locale,
                },
            },
            other || {}
        );
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

    auth(username, password, otp, remember) {
        if (typeof otp == "string") otp = otp.substr(0, 6);
        return new Promise((resolve, reject) => {
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
                    resolve(data);
                } else {
                    reject(data);
                }
            });
        });
    },

    log_out() {
        return axios.delete(`${this.apiBase}authenticate`).then(() => {
            location.reload();
        });
    },

    escape_regex(x) {
        return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    help_pipelines() {
        if (!this._pipelines)
            return this.call("help/pipelines").then((data) => {
                this._pipelines = data.result;
                return data.result;
            });
        else
            return new Promise((accept) => {
                accept(this._pipelines);
            });
    },

    help_langs() {
        if (!this._langs)
            return this.call("help/langs").then((data) => {
                this._langs = data.result;
                return data.result;
            });
        else
            return new Promise((accept) => {
                accept(this._langs);
            });
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
                    "[" + obj.map((x) => _debracket(this.querify(x))).join(";") + "]"
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

    logined() {
        return new Promise((resolve, reject) => {
            this.call("authenticate")
                .then((d) => {
                    this.user = d.result.username;
                    resolve(d);
                })
                .catch(reject);
        });
    },

    call(name, params, cancel = null) {
        _stack.push(name);
        this.bus.$emit("loading", _stack.length);
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
        this.bus.$emit("loading", _stack.length);
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
        this.bus.$emit("loading", _stack.length);
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

    queue() {
        return this.call("queue/")
            .then((data) => data.result)
            .catch(() => {});
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
        this.call(
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
                x.segments = x.name.split("--");
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
                            mongocollection: x.mongocollection,
                        };
                        parent_obj.children.push(cand);
                    }
                    parent_obj = cand;
                }

                // parent_obj.children = parent_obj.children.concat(
                //     x.sources
                //     .filter((y) => y)
                //     .sort()
                //     .filter((y) => !y.match(/[^/]\d+\.pdf$/))
                //     .map((y) => {
                //         bundles[x.name + "//" + y] = {
                //             name: x.name,
                //             mongocollection: x.mongocollection,
                //             source: y,
                //         };
                //         return {
                //             id: x.name + "//" + y,
                //             label: y.match(/(.*\/)?(.*)/)[2],
                //         };
                //     })
                // );
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

    get_item_image(item) {
        let config = this.config;

        if (!item || !item.source || (!item.source.url && !item.source.file))
            return _prompt_no_image;

        var args = "";
        if (item && item.item_type == "video") {
            if (item.thumbnail)
                return `/api/image?file=blocks.h5&block_id=${item.thumbnail}`;
            return _prompt_video;
        }
        if (config.force_thumbnail) args += "&w=1280";
        if (config.enhance) args += "&enhance=1";
        if (item.source.file) {
            if (item.source.file == "blocks.h5") item.source.block_id = item._id;
            return `/api/image${this.querystring_stringify(item.source)}${args}`;
        }
        return item.source.url;
    },

    get_item_video(item) {
        if (item.source.file) {
            if (item.source.file == "blocks.h5") item.source.block_id = item._id;
            return `/api/image${this.querystring_stringify(item.source)}`;
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

    config: LocalConfig(),
};