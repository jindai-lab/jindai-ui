<template>
  <div v-if="total > 0" ref="results">
    <div v-if="columns.includes('content')">
    <div v-for="(r, index) in visible_data" :key="index" class="mui-panel">
      <p class="">
        数据集: {{ r.collection }} 大纲: {{ r.outline }} 来源:
        {{ r.source.file }} 页码: {{ r.pagenum }} 日期: {{ (r.pdate || '') }}
      </p>
      <div class="mui-divider"></div>
      <br />
      <div v-html="r.matched_content || r.content"></div>
      <br />
      <button
        class="mui-btn"
        @click="view_page(index)"
      >
        <font-awesome-icon icon="file" aria-hidden="true" /> 查看
      </button>
      <a
        class="mui-btn"
        :href="'/view/' + (r.dataset || 'default') + '/' + r.source.file + '/' + r.source.page"
        target="_blank"
      >
        <font-awesome-icon icon="window-maximize" aria-hidden="true" /> 浏览
      </a>
      <button
        class="mui-btn"
        @click="
          show_meta[index] = !show_meta[index];
          $forceUpdate();
        "
      >
        <font-awesome-icon :icon="'caret-' + (!show_meta[index] ? 'down' : 'up')" />
        其他元数据
      </button>
      <button class="mui-btn" @click="edit_target = r">
        <font-awesome-icon icon="edit"></font-awesome-icon>
        编辑
      </button>
      <div class="mui-textfield" v-show="!!show_meta[index]">
        <textarea readonly :value="metas(r)" rows="5"></textarea>
      </div>
    </div>
    </div>
    <div class="mui-panel" v-else>
      <table>
        <thead>
          <tr>
            <th v-for="col in columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, index) in visible_data" :key="index">
            <td v-for="col in columns" :key="col + index">
              <div v-if="Array.isArray(r[col])">
                <button class="mui-btn" @click="show_embedded(r, col)">
                  <font-awesome-icon icon="file" />
                </button>
              </div>
              <div v-else>
              {{ r[col] }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination mui-row">
        <div class="float-left" v-for="p in pages" :key="p">
          <button
            class="mui-btn"
            v-if="p <= 5 || p > pages.length - 5 || Math.abs(p - page) <= 4"
            @click="turn_page(p)"
            :disabled="p == page"
          >
            {{ p }}
          </button>
          <button
            class="mui-btn"
            disabled
            v-else-if="
              p == 6 || p == page.length - 5 || Math.abs(p - page) == 5
            "
          >
            ...
          </button>
        </div>
      <div class="mui-col-md-1">
        <div class="mui-textfield">
          <label>
            页码</label>
            <input
              type="text"
              @change="turn_page(parseInt($event.target.value) || page)"
            />
        </div>
      </div>
    </div>

    <Modal v-if="show_page !== null" @close="show_page = null">
      <h3 slot="header">查看</h3>
      <div slot="body" ref="show_page_element" v-if="showing_result !== null">
        <div class="paragraphs mui-panel">
          <p>
            {{ showing_result.content }}
          </p>
          <img :src="pdf_image" alt="" style="width: 100%" />
        </div>
        <div>
          日期: {{ showing_result.pdate }}<br />
          页码: {{ showing_result.pagenum }}<br />
          大纲: {{ showing_result.outline }}<br />
          来源: {{ showing_result.source.file }} {{ showing_result.source.page }}<br>
        </div>
      </div>
    </Modal>
    
    <Modal v-if="edit_target !== null" @close="edit_target = null">
      <h3 slot="header">编辑 {{ edit_target._id }}</h3>
      <div slot="body">
        <div v-for="field, key in edit_target" :key="key">
          <ParamInput v-model="edit_target[key]" :arg="{type: typeof(field), name: key, default: '\'\''}" v-if="['_id', 'matched_content'].indexOf(key) < 0 && typeof(field) !== 'object'" />
        </div>
        <div class="mui-row">
          <ParamInput class="mui-col-md-8" v-model="edit_new_field" :arg="{type: 'string', name: '新字段', default: ''}" />
          <button class="mui-btn mui-col-md4" @click="edit_target[edit_new_field]=''; $forceUpdate()">
            <font-awesome-icon icon="plus"></font-awesome-icon>
          </button>
        </div>
        <div class="mui-divide"></div>
        <button class="mui-btn mui-btn--primary" @click="save()">保存</button>
        <button class="mui-btn" @click="edit_target = null">取消</button>
      </div>
    </Modal>

    <Modal v-if="embedded !== null" @close="embedded = null">
      <h3 slot="header">查看 {{ querify(embedded.source) }}</h3>
      <div slot="body">
        <ResultsView @load="(a) => a.callback({offset: 0, result: embedded.arr})" :total="embedded.arr.length" />
      </div>
    </Modal>

  </div>
  <div v-else ref="results">未找到匹配的结果。</div>
</template>

<script>
import Modal from './ModalView'
import ParamInput from './ParamInput'
import api from '../api'
import QueryString from 'querystring'
export default {
  name: "ResultsView",
  props: {
    load: {},
    total: { default: 0 },
    page_size: { default: 20 },
  },
  components: {
    Modal, ParamInput
  },
  data() {
    return {
      page: 1,
      value: [],
      show_meta: {},
      show_page: null,
      pdf_image: '',
      loading_image: require('../../public/assets/loading.png'),
      embedded: null,
      edit_target: null,
      edit_new_field: '',
      page_range: [0, 0],
    };
  },
  watch: {
    show_page () {
      if (this.show_page !== null) {
        this._prepare_pdfimage()
        if (this.$refs.show_page_element) this.$refs.show_page_element.parentNode.parentNode.scroll(0, 0)
      }
    }
  },
  computed: {
    pages() {
      var p = [];
      for (
        let index = 0, i = 1;
        index < (this.total || this.value.length) && i <= 1000;
        index += this.page_size, i++
      ) {
        p.push(i);
      }
      return p;
    },
    visible_data() {
      return this.value
        .slice(this.offset - this.page_range[0])
        .slice(0, this.page_size);
    },
    offset() {
      return (this.page - 1) * this.page_size;
    },
    columns () {
      var cols = new Set()
      for (var r of this.visible_data) {
        for (var k in r)
          cols.add(k)
      }
      return Array.from(cols).sort()
    },
    showing_result() {
      return this.visible_data[this.show_page] || null
    }
  },
  mounted() {
    this.start()
  },
  created() {
    this.handler = (e) => {
      this.$emit("keyup", e);
      if (e.target.tagName == "INPUT" || this.show_page === null) return;
      
      const that = this
      function __cb_update_show_page(set_value) {
        return () => {
          that.show_page = set_value >= 0 ? set_value : that.visible_data.length + set_value
        }
      }

      switch (e.key) {
        case "ArrowRight":
        case "ArrowLeft":
          var inc = e.key == 'ArrowRight' ? 1 : -1
          this.show_page += inc
          if (this.show_page >= this.visible_data.length) {
            this.show_page = null
            this.turn_page(this.page + 1, __cb_update_show_page(0))
          } else if (this.show_page < 0) {
            this.show_page = null
            this.turn_page(this.page - 1, __cb_update_show_page(-1))
          }
          break;
        default:
          break;
      }

    };
    window.addEventListener("keyup", this.handler);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.handler);
  },
  methods: {
    _fetched() {
      return this.page_range[0] <= this.offset && this.page_range[1] > this.offset;
    },
    _prepare_pdfimage() {
      this.pdf_image = this.loading_image
      if (this.showing_result === null) return
      var image_url = "/api/image?" + QueryString.stringify(this.showing_result.source)
      var image_element = new Image();
      image_element.src = image_url;
      image_element.onload = () => {
          this.pdf_image = image_element.src
      }
    },
    start() {
      this.page_range = [0, 0];
      this.turn_page(1);
    },
    querify: api.querify,
    turn_page(p, cb) {
      this.page = p;
      this.show_meta = {};
      window.scroll({ top: this.$refs.results.offsetTop - 64 });
      if (!this._fetched()) {
        this.$emit("load", {
          offset: this.offset,
          limit: this.page_size * 5,
          callback: (data) => {
            this.page_range = [data.offset, data.offset + data.result.length];
            this.value = data.result;
            if (typeof cb !== 'undefined') cb();
          },
        });
      }
    },
    show_embedded(r, col) {
      var source = Object.assign({}, r)
      delete source[col]
      this.embedded = { arr: r[col], source }
    },
    view_page(index) {
      this.show_page = index;
    },
    metas(r) {
      var s = "";
      for (var k in r) {
        if (
          [
            "_id",
            "collectoin",
            "matched_content",
            "content",
            "pagenum",
            "pdate",
            "source",
          ].includes(k)
        )
          continue;
        s += k + ": " + JSON.stringify(r[k]) + "\n";
      }
      return s;
    },
    save() {
      api.call('paragraphs/' + this.edit_target._id, this.edit_target).then(() => {
        this.edit_target = null
        api.notify({ title: "保存成功" });
      })
    }
  },
};
</script>

<style scoped>
.float-left {
  float: left;
  margin-right: 10px
}
</style>