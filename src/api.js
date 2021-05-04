import axios from 'axios'
import Vue from 'vue'
const apiBase = '/api/'
const _stack = []
var _token = localStorage.token || ''

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

    _catch_and_then(promise) {
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
                throw new Error(resp.data.exception)
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
                'X-Authentication-Token': _token
            }
        }, other || {})
    },

    auth(username, password) {
        return new Promise((resolve, reject) => {
            this.call('authenticate', {
                username, password
            }).then(data => {
                if (data) {
                    _token = data.result
                    localStorage.token = data.result
                    resolve(data)
                } else {
                    reject(data)
                }
            })
        })
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

    delete(name) {
        _stack.push(name)
        _set_loading()
        return this._catch_and_then(axios.delete(apiBase + name, this._config()))
    },

    put(name, params) {
        _stack.push(name)
        _set_loading()
        return this._catch_and_then(axios.put(apiBase + name, params, this._config()))
    },

    blob(name) {
        _stack.push('url')
        _set_loading()
        return this._catch_and_then(
            axios.get(apiBase + name, this._config(
                { responseType: 'blob' }
            ))).then(data => {
                var objectURL = URL.createObjectURL(data);
                return objectURL
            })
    },

    download(path, filename) {
        this.blob(path).then(url => {

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
        })
    },

    queue() {
        return axios.get(apiBase + 'queue/', this._config())
    }

}