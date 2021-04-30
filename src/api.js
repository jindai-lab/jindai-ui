import axios from 'axios'
const apiBase = '/api/'
var _token = localStorage.token || ''

import Vue from 'vue'

export default {

    notify(notice) { Vue.notify(Object.assign(notice, { group: 'sys' })) },

    _catch_and_then(promise) {
        return new Promise((resolve, reject) => {
            promise.then(resp => {
                if (resp.data.exception) {
                    if (resp.data.exception == 'Forbidden.') {
                        localStorage.token = ''
                        resp.data.exception = '登录失效，请重新登录。'
                        if (!location.href.endsWith('/login')) location.href = '/login'
                    }
                    this.notify({
                        title: resp.data.exception
                    })
                    reject(resp.data)
                } else {
                    resolve(resp.data)
                }
            }).catch(ex => {
                this.notify({ title: '网络故障', text: ex })
            })
        })
    },

    _config() {
        return {
            headers: {
                'X-Authentication-Token': _token
            }
        }
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
        if (typeof (params) !== 'undefined')
            return this._catch_and_then(axios.post(apiBase + name, params, this._config()))
        else
            return this._catch_and_then(axios.get(apiBase + name, this._config()))
    },

    delete(name) {
        return this._catch_and_then(axios.delete(apiBase + name, this._config()))
    },

    put(name, params) {
        return this._catch_and_then(axios.put(apiBase + name, params, this._config()))
    },

    result_url(id) {
        return apiBase + 'queue/' + id
    },

    pdf_image(pdffile, pdfpage, dataobj) {
        axios.get(apiBase + 'pdfimage?pdffile=' + encodeURIComponent(pdffile) + '&pdfpage=' + pdfpage, Object.assign(
            {},
            this._config(),
            {responseType: 'blob'}
        )).then(resp => {
            var objectURL = URL.createObjectURL(resp.data);
            dataobj.pdf_image = objectURL;
        })
    },

    switch_pane(name) {
        window.mui.tabs.activate('pane-' + name)
    },

}