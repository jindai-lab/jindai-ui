import axios from 'axios'
import Vue from 'vue'
import Cookies from 'js-cookie'

const _BASE = '/api/gallery'

export default {
    _loading: [],
    bus: new Vue({}),

    load_config(name, defaults = {}) {
        var s = localStorage[name]
        if (s) Object.assign(defaults, JSON.parse(s))
        return defaults
    },

    save_config(name, config) {
        localStorage[name] = JSON.stringify(config);
    },

    call(name, data, method = 'post', show_loading = true) {
        var key = new Date().toJSON() + Math.random()
        if (show_loading) this._loading.push(key)
        this.bus.$emit('loading', this._loading)
        return axios[method](`${_BASE}/${name}`, data).then(resp => {
            if (show_loading) this._loading.splice(this._loading.indexOf(key), 1)
            this.bus.$emit('loading', this._loading)
            if (resp.data.exception) {
                console.log(resp.data)
                throw new Error(resp.data.exception)
            }
            return resp.data
        }).catch(err => {
            if (show_loading) this._loading.splice(this._loading.indexOf(key), 1)
            this.bus.$emit('loading', this._loading)
            console.log('Error', err)
            this.bus.$emit('alert', err.exception || err)
            throw err
        })
    },

    auth(username, password, remember) {
        return new Promise((resolve, reject) => {
            this.call('authenticate', { username, password }).then((data) => {
                if (data && data.result) {
                    Cookies.set('token', data.result, remember ? { expires: 7 } : undefined)
                    resolve(data)
                } else {
                    throw new Error('Not authorized.')
                }
            }).catch(reject)
        })
    },

    log_out() {
        return this.call('authenticate', {}, 'delete').then(() => { location.reload() })
    },

    fetch(params) {
        return this.call('get', params).then(data => {
            if (data.redirect) {
                location.href = data.redirect
            }
            data.results = data.results.map(post => {
                post.author = post.author || (post.tags.filter(x => x.startsWith('@')) || [''])[0]
                post.group = post.group_id ? '?query=' + post.group_id : '?query=id%3D' + post._id
                post.selected = false
                post.items.forEach(i => { i.rating = i.rating || 0 })
                return post
            })
            return data
        })
    },

    call_tool(bundle, callback) {
        var last_response_len = false
        axios.post(`${_BASE}/plugins/tool`, bundle, {
            onDownloadProgress: function(e) {
                var this_response, response = e.currentTarget.response;
                if (last_response_len === false) {
                    this_response = response;
                    last_response_len = response.length;
                } else {
                    this_response = response.substring(last_response_len);
                    last_response_len = response.length;
                }
                callback(this_response.split('\n'));
            },
        }).then(() => this.bus.$emit("alert", { message: "Complete" }))
    },

    get_item_image(item, config = {}) {

        if (typeof item === "undefined" || !item.url)
            return "https://via.placeholder.com/350x150.png?text=No Image";

        var ext = item.url.split(".").pop();
        if (ext === "mp4") {
            if (item.thumbnail) return `${_BASE}/block/${item.thumbnail}`;
            return "https://via.placeholder.com/350x150.png?text=Video";
        }
        if (config.force_thumbnail) {
            if (ext.indexOf('?') < 0) ext += '?'
            else ext += '&'
            ext += "w=1280";
        }
        if (config.enhance) {
            if (ext.indexOf('?') < 0) ext += '?'
            else ext += '&'
            ext += 'enhance=1'
        }
        if (item.storage) return `${_BASE}/block/${item._id}.${ext}`;
        return item.url;
    },

    get_item_video(item) {
        if (item.storage) return `${_BASE}/block/${item._id}.mp4`;
        return `${_BASE}/${item.url}`;
    },
}