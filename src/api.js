import axios from 'axios'
import Vue from 'vue'
import Cookies from 'js-cookie'

const apiBase = '/api/'
const _stack = []
var _token = localStorage.token || ''
Cookies.set('token', _token)

function _set_loading() {
    var disp = document.getElementsByClassName('loading')[0].style
    if (_stack.length > 0) {
        disp.display = 'block';
    } else {
        disp.display = 'none';
    }
}

export default {

    stack: _stack,

    apiBase,

    notify(notice) { Vue.notify(Object.assign(notice, { group: 'sys' })) },

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
                _set_loading()
            }
            if (resp.data.exception) {
                if (resp.data.exception == 'Forbidden.') {
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
                _set_loading()
            }
            this.notify({ title: '错误', text: ex, type: 'warn' })
            throw ex
        })
    },

    _config(other) {
        return Object.assign({
            headers: {
                'X-Authentication-Token': _token,
            }
        }, other || {})
    },

    auth(username, password) {
        return new Promise((resolve, reject) => {
            this.call('authenticate', {
                username, password
            }).then(data => {
                if (data) {
                    localStorage.token = _token = data.result
                    Cookies.set('token', _token)
                    resolve(data)
                } else {
                    reject(data)
                }
            })
        })
    },

    querify(obj) {       
      function _values(x, indent) {
        if (Array.isArray(x)) {
          if (x.length > 0 && x.filter(y => y.length == 2).length == x.length)
            return '([]' + _querify(x, indent + '  ') + '\n' + indent + ')'
          return '([]' + (x.length > 0 ? ' => ' + x.map(_values).join(' => ') : '') + ')'
        } else if (typeof(x) === 'object') {
          return '(' + _params(x, indent + '  ') + ')'
        } else
          return JSON.stringify(x)
      }
      function _params(c, indent) {
        var r = []
        for (var k in c) {
          if (typeof(c[k]) === 'undefined') continue
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
            this.call('authenticate').then(resolve).catch(reject)
        })
    },

    call(name, params) {
        _stack.push(name)
        _set_loading()
        if (typeof (params) !== 'undefined')
            return this._catch_and_then(axios.post(apiBase + name, params, this._config()))
        else
            return this._catch_and_then(axios.get(apiBase + name, this._config()))
    },

    delete(name, params) {
        _stack.push(name)
        _set_loading()
        if (typeof (params) !== 'undefined')
            return this._catch_and_then(axios.delete(apiBase + name, params, this._config()))
        else
            return this._catch_and_then(axios.delete(apiBase + name, this._config()))
    },

    put(name, params) {
        _stack.push(name)
        _set_loading()
        return this._catch_and_then(axios.put(apiBase + name, params, this._config()))
    },

    queue() {
        return axios.get(apiBase + 'queue/', this._config()).then(resp => resp.data.result).catch(() => {})
    }

}
