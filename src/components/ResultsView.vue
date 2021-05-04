<template>
  <div v-if="value.length > 0" :ref="'results'">
    <div v-for="(r, index) in value.slice((page-1) * 20, page * 20)" :key="r._id" class="mui-panel">
      <p class="">
        数据集: {{ r.collection }} 大纲: {{ r.outline }} 来源:
        {{ r.pdffile }} 页码: {{ r.pagenum }} 年份: {{ r.year }}
      </p>
      <div class="mui-divider"></div>
      <br />
      <div v-html="r.matched_content || r.content"></div>
      <br />
      <a
        class="mui-btn"
        :href="'/view/' + r.pdffile + '/' + r.pdfpage"
        target="_blank"
      >
        <font-awesome-icon icon="file" aria-hidden="true" /> 查看
      </a>
      <button class="mui-btn" @click="show_meta[index] = !show_meta[index]; $forceUpdate()">
        <i :class="['fa', 'fa-caret-' + (!show_meta[index] ? 'down' : 'up')]" /> 其他元数据
      </button>
      <div class="mui-textfield" v-show="!!show_meta[index]">
        <textarea readonly :value="metas(r)" rows="5"></textarea>
      </div>
    </div>
    <div class="pagination">
      <button class="mui-btn" v-for="p in pages" :key="p" @click="turn_page(p)" :disabled="p == page">{{ p }}</button>
    </div>
  </div>
  <div v-else>未找到匹配的结果。</div>
</template>

<script>
export default {
    name: 'ResultsView',
    props: ['value'],
    data () {
      return {
        page: 1,
        show_meta: {}
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
    watch: {
      value () {
        this.page = 1
      }
    },
    methods: {
      turn_page (p) {
        this.page = p
        this.show_meta = {}
        window.scroll({top: this.$refs['results'].offsetTop - 64})
      },
      metas(r) {
        var s = ''
        for(var k in r) {
          if (['_id', 'collectoin', 'matched_content', 'content', 'pdffile', 'pdfpage', 'pagenum', 'year'].indexOf(k) >= 0) continue
          s += k + ': ' + JSON.stringify(r[k]) + '\n'
        }
        return s
      }
    }
}
</script>
