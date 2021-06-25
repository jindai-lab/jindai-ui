<template>
  <div v-if="total > 0" ref="results">
    <div v-for="(r, index) in visible_data" :key="r._id" class="mui-panel">
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
      <button
        class="mui-btn"
        @click="
          show_meta[index] = !show_meta[index];
          $forceUpdate();
        "
      >
        <i :class="['fa', 'fa-caret-' + (!show_meta[index] ? 'down' : 'up')]" />
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
    
    <Modal v-if="edit_target !== null" @close="edit_target = null">
      <h3 slot="header">编辑 {{ edit_target._id }}</h3>
      <div slot="body">
        <div v-for="field, key in edit_target" :key="key">
          <ParamInput v-model="edit_target[key]" :arg="{type: typeof(field), name: key, default: '\'\''}" v-if="['_id', 'matched_content'].indexOf(key) < 0 && typeof(field) !== 'object'" />
        </div>
        <div class="mui-row">
          <ParamInput class="mui-col-md-8" v-model="edit_new_field" :arg="{type: 'string', name: '新字段', default: '\'\''}" />
          <button class="mui-btn mui-col-md4" @click="edit_target[edit_new_field]=''; $forceUpdate()">
            <font-awesome-icon icon="plus"></font-awesome-icon>
          </button>
        </div>
        <div class="mui-divide"></div>
        <button class="mui-btn mui-btn--primary" @click="save()">保存</button>
        <button class="mui-btn" @click="edit_target = null">取消</button>
      </div>
    </Modal>

  </div>
  <div v-else ref="results">未找到匹配的结果。</div>
</template>

<script>
import Modal from './ModalView'
import ParamInput from './ParamInput'
import api from '../api'
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
      edit_target: null,
      edit_new_field: '',
      page_range: [0, 0],
    };
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
    }
  },
  methods: {
    _fetched() {
      const p = this.page * this.page_size;
      return this.page_range[0] <= p && this.page_range[1] > p;
    },
    start() {
      this.page_range = [0, 0];
      this.turn_page(1);
    },
    turn_page(p) {
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
          },
        });
      }
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
            "pdffile",
            "pdfpage",
            "pagenum",
            "year",
          ].indexOf(k) >= 0
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