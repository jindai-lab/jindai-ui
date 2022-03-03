import api from '../api'

export default {

    fetch(params, cancel) {
        params = Object.assign({}, params, {
            query: '(' + [params.q, params.req].filter(x => x).join('),(') + ')',
            req: undefined,
            q: undefined
        })
        return api.call('gallery/get', params, cancel).then(data => {
            if (!data) return;
            if (data.redirect) {
                location.href = data.redirect
                return;
            }
            if (data.results) {
                data.results = data.results.map(album => {
                    album.author = album.author || (album.keywords.filter(x => x.startsWith('@')) || [''])[0]
                    album.group = album.group_id ? '?q=' + album.group_id : '?q=id%3D' + album._id
                    album.selected = false
                    album.images.forEach(i => { i.rating = i.rating || 0; })
                    return album
                })
            }
            return data
        })
    },

    get_item_image(item, config = {}) {

        if (typeof item === "undefined" || (!item.source.url && !item.source.file))
            return "https://via.placeholder.com/350x150.png?text=No Image";

        var ext = (item.source.url || item.source.file).split(".").pop(),
            args = '';
        if (ext === "mp4") {
            if (item.thumbnail) return `/api/image?file=blocks.h5&block_id=${item.thumbnail}`;
            return "https://via.placeholder.com/350x150.png?text=Video";
        }
        if (config.force_thumbnail)
            args += '&w=1280'
        if (config.enhance)
            args += '&enhance=1'
        if (item.source.file) {
            if (item.source.file == 'blocks.h5') item.source.block_id = item._id;
            return `/api/image${api.querystring_stringify(item.source)}${args}`;
        }
        return item.source.url;
    },

    get_item_video(item) {
        if (item.source.file) {
            if (item.source.file == 'blocks.h5') item.source.block_id = item._id;
            return `/api/image${api.querystring_stringify(item.source)}`;
        }
        return item.source.url;
    },

}