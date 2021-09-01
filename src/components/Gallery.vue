<template>
  <div>
    <h3>图集</h3>
    <div class="mui-panel">
      <div id="selectors" class="mui-row">
        <div class="mui-select mui-col-md-4">
          <select name="collection" id="collection" v-model="selected_gallery">
            <option value="">默认</option>
            <option v-for="ds in galleries" :value="ds.id" :key="ds.id">
              {{ ds.name }}
            </option>
          </select>
        </div>
        <div class="mui-select mui-col-md-2">
          <select name="sort" id="sort" v-model="sort">
            <option value="_id=-1">默认排序</option>
            <option value="year=1">从旧到新</option>
            <option value="year=-1">从新到旧</option>
            <option value="source=1">出处</option>
            <option value="random">随机浏览</option>
          </select>
        </div>
      </div>
      <div id="search">
        <param-input
          :arg="{ type: 'str', name: '查询条件', default: '\'\'' }"
          v-model="querystr"
          @keyup.enter.ctrl.exact="jump_to(querystr)"
        />
      </div>
      <div class="clear"></div>
      <button id="search" class="mui-btn" @click="jump_to(querystr)">
        查询
      </button>
    </div>
    <div v-if="total">共找到 {{ total }} 个结果。</div>
    <div class="container-water-fall" @keyup="keyup">
      <vue-viewer
        multiple
        :thumb="images"
        ref="viewer"
        list-ul-class="image-list"
        :full="images"
      >
      </vue-viewer>
      <waterfall :col="5" :data="results" @scroll="scroll" ref="waterfall">
        <div class="mui-panel item" v-for="(r, index) in results" :key="r._id">
          <img
            :src="r.image_src"
            alt=""
            @click="select_image"
            @dblclick="view(index)"
          />
          <div class="mui-row">
            {{ r.content }}
          </div>
          <div class="mui-row">
            <span class="meta author"
              >作者:
              <a
                href="javascript:void(0);"
                @click="jump_to({ people: p })"
                v-for="p in r.people"
                :key="p"
                >{{ p }}</a
              ></span
            >
            <span class="meta groups"
              >分组:
              <a
                href="javascript:void(0);"
                @click="jump_to({ group: p })"
                v-for="p in r.groups"
                :key="p"
                >{{ p }}</a
              ></span
            >
            <span class="meta source"
              >来源:
              <a
                href="javascript:void(0);"
                @click="jump_to({ source: r.source })"
              >
                {{ r.source.url }}
              </a>
              <a :href="r.source.url" target="_blank" v-if="r.source.url"
                ><font-awesome-icon
                  icon="window-restore"
                ></font-awesome-icon> </a
            ></span>
            <span class="meta keywords"
              >标签:
              <a
                href="javascript:void(0);"
                @click="jump_to({ keywords: p })"
                v-for="p in r.tags"
                :key="p"
                >{{ p }}</a
              ></span
            >
          </div>
        </div>
      </waterfall>
    </div>
  </div>
</template>
    
<script>
import api from "../api";
import ParamInput from "./ParamInput.vue";

export default {
  components: { ParamInput },
  name: "Gallery",
  props: ["q"],
  data() {
    return {
      galleries: [],
      selected_gallery: "",
      req: {},
      sort: "_id=-1",
      querystr: "",
      reqstr: "",
      total: 0,
      results: [],
      loading: false,
    };
  },
  computed: {
    images() {
      return this.results.map((x) => x.image_src);
    },
  },
  mounted() {
    api.call("meta").then((data) => {
      this.galleries = data.result.galleries;
    });
    this.querystr = this.q || "";
    this.load_more();
  },
  methods: {
    load_more() {
      if (this.loading) return;
      this.loading = true;
      var query = "??match((" + this.querystr + ")&image_storage!=null)";
      if (this.sort === "random") query += ";sample(100)";
      else {
        query +=
          ";sort(" +
          this.sort +
          ");skip(" +
          this.results.length +
          ");limit(100)";
      }
      api.call("quicktask", { query, raw: true }).then((data) => {
        if (data.result.length == 0) return; // loading = true, will not be called again
        this.results = this.results.concat(
          data.result.map((x) => {
            if (typeof x.image_storage === "string") {
              if (x.image_storage === "blocks.h5")
                x.image_src = "image?file=blocks.h5&id=" + x._id;
              else if (x.image_storage === "source.pdf")
                x.image_src =
                  "image?file=" + x.source.file + "&page=" + x.source.page;
              else if (x.image_storage === "") x.image_src = x.url;
            }
            if (x.image_src) {
              api.blob(x.image_src).then((u) => (x.image_src = u));
            }
            return x;
          })
        );
        this.loading = false;
      });
    },
    scroll(e) {
      if (
        e.scrollTop + e.scrollHeight >
        this.$refs.waterfall.root.scrollHeight
      ) {
        this.scroll(this.$refs.waterfall.root.scrollHeight - e.clientHeight);
        this.load_more();
      }
    },
    view(e) {
      this.$refs.viewer.showFullViewer(e);
    },
    jump_to(obj) {
      if (typeof obj !== "string") obj = api.querify(obj);
      this.$router.push("/gallery/" + obj);
    },
    select_image(e) {
      console.log(e);
    },
    keyup(e) {
      switch (e.key) {
        case "ArrowLeft":
          this.$refs.viewer.prev();
          break;
        case "ArrowRight":
          this.$refs.viewer.next();
          break;
      }
    },
  },
};
</script>

<style scoped>
span.mui-checkbox {
  float: left;
  margin: 5px;
}

.clear {
  clear: both;
}

span.meta a {
  margin-right: 5px;
}

span.meta {
  margin-right: 5px;
}

.item {
  word-break: break-all;
  margin-left: 15px;
}

.item img {
  width: 100%;
  display: block;
}

.mui-row {
  padding: 15px;
}
</style>

<style>
ul.image-list {
  display: none;
}
</style>