<template>
  <div v-if="value.length > 0" :ref="'results'">
    <div v-for="r in value.slice((page-1) * 20, page * 20)" :key="r._id" class="mui-panel">
      <p class="">
        数据集: {{ r.collection }} 大纲: {{ r.outline }} 来源:
        {{ r.pdffile }} 页码: {{ r.pagenum }} 年份: {{ r.year }}
      </p>
      <div class="mui-divider"></div>
      <br />
      <div v-html="r.matched_content || r.content"></div>
      <br />
      <button
        class="mui-btn"
        @click="view_pdf(r.pdffile, r.pdfpage)"
      >
        <i class="fa fa-file" aria-hidden="true"></i> 查看
      </button>
    </div>
    <div class="pagination">
      <button class="mui-btn" v-for="p in pages" :key="p" @click="turn_page(p)" :disabled="p == page">{{ p }}</button>
    </div>
  </div>
  <div v-else>未找到匹配的结果。</div>
</template>

<script>
import api from '../api'

export default {
    name: 'ResultsView',
    props: ['value'],
    data () {
      return {
        page: 1
      }
    },
    computed: {
      pages() {
        var p = []
        for (let index = 0, i = 1; index < this.value.length; index += 20, i++) {
          p.push(i)
        }
        return p
      }
    },
    methods: {
      turn_page (p) {
        this.page = p
        window.scroll({top: this.$refs['results'].offsetTop - 64})
      },
      view_pdf(pdffile, pdfpage) {
        api.switch_pane('view') 
        this.$root.$emit('view', pdffile, pdfpage) 
      }
    }
}
</script>
