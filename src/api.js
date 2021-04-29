import axios from 'axios'
const apiBase = '/api/'

export default {
    
    call(name, params) {
        if (typeof(params) !== 'undefined')
            return axios.post(apiBase + name, params)
        else
            return axios.get(apiBase + name)
    },

    delete(name) {
        return axios.delete(apiBase + name)
    },

    put(name, params) {
        return axios.put(apiBase + name, params)
    },

    result_url(id) {
        return apiBase + 'queue/' + id
    },

    pdf_image(pdffile, pdfpage) {
        return apiBase + 'pdfimage?pdffile=' + encodeURIComponent(pdffile) + '&pdfpage=' + pdfpage
    }

}