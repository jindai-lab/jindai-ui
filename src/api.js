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

    notify(notice) { Vue.notify(Object.assign(notice, { group: 'sys' })) },

    _catch_and_then(promise) {
        return new Promise((resolve, reject) => {
            promise.then(resp => {
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
                    this.notify({
                        title: resp.data.exception,
                        type: 'warn'
                    })
                    reject(resp.data)
                } else {
                    resolve(resp.data)
                }
            }).catch(ex => {
                if (_stack.length > 0) {
                    _stack.pop()
                    _set_loading()
                }
                this.notify({ title: '网络故障', text: ex })
            })
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

    result_url(id) {
        return apiBase + 'queue/' + id
    },

    pdf_image(pdffile, pdfpage, dataobj) {
        axios.get(apiBase + 'pdfimage?pdffile=' + encodeURIComponent(pdffile) + '&pdfpage=' + pdfpage, this._config(
            { responseType: 'blob' }
        )).then(resp => {
            var objectURL = URL.createObjectURL(resp.data);
            dataobj.pdf_image = objectURL;
        })
    },

    file_url(f) {
        return apiBase + 'storage/' + f
    },

    queue() {
        return axios.get(apiBase + '/queue/', this._config())
    }

}