import axios from 'axios'
import Vue from 'vue'
import Cookies from 'js-cookie'

const apiBase = '/api/'
const _stack = []
var _token = localStorage.token || ''
Cookies.set('token', _token)

export default {

    stack: _stack,

    bus: new Vue(),

    user: '',

    apiBase,

    notify(notice) { this.bus.$emit("alert", notice) },

    querystring_parse(str) {
        var params = {}
        for (var pair of new URLSearchParams(str).entries()) {
            if (pair[1].startsWith("JSON__"))
                pair[1] = JSON.parse(pair[1].slice(6));
            else if (pair[1].match(/^\d+$/)) pair[1] = +pair[1];
            else if (pair[1].match(/^(true|false)$/)) pair[1] = pair[1] == "true";
            params[pair[0]] = pair[1];
        }
        return params
    },

    querystring_stringify(obj) {
        var str = ''
        for (var k in obj) {
            let o = obj[k]
            str += `&${k}=`
            switch (typeof o) {
                case 'object':
                    str += 'JSON__' + encodeURIComponent(JSON.stringify(o))
                    break
                case 'string':
                    str += encodeURIComponent(o)
                    break
                default:
                    str += o
                    break
            }
        }
        if (str === '') return ''
        return '?' + str.substring(1)
    },

    blob_download(blob, filename) {
        var url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // this is necessary as link.click() does not work on the latest firefox
        link.dispatchEvent(
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
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
            this.name = 'DataError'
            this.message = message
            this.stack = stack
        }
        DataError.prototype = Object.create(Error.prototype);
        DataError.prototype.constructor = DataError;

        return promise.then(resp => {
            if (_stack.length > 0) {
                _stack.pop()
                this.bus.$emit('loading', _stack.length)
            }
            if (resp.data.exception) {
                if (resp.data.exception.match('Forbidden.')) {
                    localStorage.token = ''
                    resp.data.exception = '登录失效，请重新登录。'
                    if (!location.href.endsWith('/login')) location.href = '/login'
                }
                throw new DataError(resp.data.exception, resp.data.tracestack.join('\n'))
            } else {
                return resp.data
            }
        }).catch(ex => {
            if (_stack.length > 0) {
                _stack.pop()
                this.bus.$emit('loading', _stack.length)
            }
            if (ex.message.match('code 502'))
                ex = '后台连接失败，请重试。'
            this.notify({ title: '错误', text: ex, type: 'warn' })
            throw ex
        })
    },

    _config(other) {
        return Object.assign({
            headers: {
                'X-Authentication-Token': _token,
            },
        }, other || {})
    },

    auth(username, password, remember) {
        return new Promise((resolve, reject) => {
            this.call('authenticate', {
                username,
                password
            }).then(data => {
                if (data) {
                    localStorage.token = _token = data.result
                    Cookies.set('token', _token, remember ? { expires: 30 } : undefined)
                    resolve(data)
                } else {
                    reject(data)
                }
            })
        })
    },

    log_out() {
        return this.call('authenticate', {}, 'delete').then(() => { location.reload() })
    },

    querify(obj) {
        function _values(x, indent) {
            if (Array.isArray(x)) {
                if (x.length > 0 && x.filter(y => y.length == 2).length == x.length)
                    return '([]' + _querify(x, indent + '  ') + '\n' + indent + ')'
                return '([]' + (x.length > 0 ? ' => ' + x.map(_values).join(' => ') : '') + ')'
            } else if (typeof (x) === 'object') {
                return '(' + _params(x, indent + '  ') + ')'
            } else
                return JSON.stringify(x)
        }

        function _params(c, indent) {
            var r = []
            for (var k in c) {
                if (typeof (c[k]) === 'undefined') continue
                r.push(indent + k + '=' + _values(c[k], indent))
            }
            if (r.length > 1)
                return '\n' + r.join(',\n')
            else
                return (r[0] || '').trim()
        }

        function _querify(v, indent) {
            var s = ''
            for (var i of v) {
                var c = _params(i[1], indent + '  ')
                if (c.indexOf('\n') >= 0) c += indent + '\n'
                s += ';\n' + indent + i[0] + '(' + c + ')'
            }
            return s
        }

        if (Array.isArray(obj))
            return _querify(obj, '').substr(2)
        else
            return _params(obj, '')
    },

    logined() {
        return new Promise((resolve, reject) => {
            this.call('authenticate').then(d => {
                this.user = d.result.username
                resolve(d)
            }).catch(reject)
        })
    },

    call(name, params, cancel = null) {
        _stack.push(name)
        this.bus.$emit('loading', _stack.length)
        if (typeof (params) !== 'undefined')
            return this._catch_and_then(axios.post(apiBase + name, params, this._config(cancel ? { cancelToken: cancel.token } : {})))
        else
            return this._catch_and_then(axios.get(apiBase + name, this._config(cancel ? { cancelToken: cancel.token } : {})))
    },

    fetch_logs(key) {
        var last_response_len = false
        const that = this
        axios.get(`${apiBase}queue/logs/${key}`, {
            onDownloadProgress: function (e) {
                var this_response, response = e.currentTarget.response;
                if (last_response_len === false) {
                    this_response = response;
                    last_response_len = response.length;
                } else {
                    this_response = response.substring(last_response_len);
                    last_response_len = response.length;
                }
                that.bus.$emit('console', { key, content: this_response.split('\n') });
            },
        }).then((data) => {
            that.bus.$emit("finish", key)
            that.bus.$emit("console", { key, content: data.resp.substring(last_response_len).split('\n') })
        })
    },

    delete(name, params) {
        _stack.push(name)
        this.bus.$emit('loading', _stack.length)
        if (typeof (params) !== 'undefined')
            return this._catch_and_then(axios.delete(apiBase + name, params, this._config()))
        else
            return this._catch_and_then(axios.delete(apiBase + name, this._config()))
    },

    put(name, params) {
        _stack.push(name)
        this.bus.$emit('loading', _stack.length)
        return this._catch_and_then(axios.put(apiBase + name, params, this._config()))
    },

    _queue_cancel: null,

    queue() {
        if (this._queue_cancel)
            this._queue_cancel.cancel()
        this._queue_cancel = this.cancel_source()
        return axios.get(apiBase + 'queue/', this._config({
            cancelToken: this._queue_cancel.token
        })).then(resp => resp.data.result).catch(() => { })
    },

    fav(r) {
        const key = 'favored:' + this.user
        var bundle = { keywords: key }
        if (this.favored(r)) {
            r.keywords = r.keywords.filter(x => x != key)
            bundle = { $pull: bundle }
        } else {
            r.keywords.push(key)
            bundle = { $push: bundle }
        }
        this.call(`edit/${r.dataset || 'paragraph'}/${r._id}`, bundle)
    },

    favored(r) {
        return r.keywords.includes('favored:' + this.user)
    },

    get_collections() {

        function _segs(x) {
            var r = [], s = ''
            for (var seg of x.name.split('--')) {
                s += seg
                r.push(s)
                s += '--'
            }
            return r
        }

        return this.call("collections").then((data) => {
            var weights = {}, colls = data.result.sort(x => x.order_weight);
            for (var c of colls) {
                for (var s of _segs(c))
                    if (!weights[s])
                        weights[s] = c.order_weight
            }

            function _comp(x, y) {
                var s1 = _segs(x), s2 = _segs(y)
                for (var si = 0; si < s1.length && si < s2.length; ++si) {
                    let xx = s1[si], yy = s2[si]
                    if (weights[xx] !== weights[yy])
                        return weights[xx] - weights[yy]
                }
                return x.name.localeCompare(y.name)
            }

            return colls.sort(_comp)
        })
    }

}