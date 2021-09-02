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
            <option value="pdate=1">从旧到新</option>
            <option value="pdate=-1">从新到旧</option>
            <option value="source=1">出处</option>
            <option value="random">随机浏览</option>
          </select>
        </div>
      </div>
      <div id="search">
        <param-input
          :arg="{ type: 'str', name: '查询条件', default: '\'\'' }"
          v-model="querystr"
          @keyup.enter.control.exact="jump_to(querystr)"
        />
      </div>
      <div class="clear"></div>
      <button id="search" class="mui-btn" @click="jump_to(querystr)">
        查询
      </button>
    </div>
    <div v-if="total">共找到 {{ total }} 个结果。</div>
    <div class="viewer" v-if="viewer" v-touch:swipe="swipe_handler">
      <video controls v-if="viewer_image.is_video">
        <source src="" type="video/mp4" />
      </video>
      <div class="showing-wrapper" v-else>
        <img :src="viewer_image.image_src" />
      </div>
      <div class="text-wrapper">
        <GalleryImageInfo
          :item="viewer_image"
          @jump_to="jump_to"
          style="margin: 15px; padding-top: 50px"
        />
      </div>
      <div class="close">
        <a href="javascript:void(0);" @click="viewer = false">
          <svg
            version="1.1"
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            width="64px"
            height="64px"
            viewBox="0 0 64 64"
            enable-background="new 0 0 64 64"
            xml:space="preserve"
          >
            <g id="CLOSE_1_" enable-background="new">
              <g id="CLOSE">
                <g>
                  <path
                    d="M36.243,32l11.879-11.879C48.664,19.579,49,18.828,49,18c0-1.657-1.343-3-3-3c-0.828,0-1.578,0.336-2.121,0.879
							L32,27.757L20.121,15.879C19.578,15.336,18.828,15,18,15c-1.657,0-3,1.343-3,3c0,0.828,0.336,1.578,0.879,2.121L27.757,32
							L15.879,43.879C15.336,44.422,15,45.172,15,46c0,1.657,1.343,3,3,3c0.828,0,1.578-0.336,2.121-0.879L32,36.243l11.879,11.879
							C44.422,48.664,45.172,49,46,49c1.657,0,3-1.343,3-3c0-0.828-0.336-1.578-0.879-2.121L36.243,32z"
                  />
                </g>
              </g>
            </g>
          </svg>
        </a>
      </div>
    </div>
    <div class="container-water-fall">
      <waterfall :col="5" :data="results" @scroll="scroll" ref="waterfall">
        <div class="mui-panel item" v-for="(r, index) in results" :key="r._id">
          <img
            :src="r.image_src"
            alt=""
            @click="select_image(index)"
            @dblclick="view(index)"
          />
          <GalleryImageInfo :item="r" @jump_to="jump_to" />
          <div class="top-right-icon mui--bg-primary" v-show="r.selected">
            <font-awesome-icon icon="check"></font-awesome-icon>
          </div>
        </div>
      </waterfall>
    </div>
    <div class="actions">
      <button
        class="mui-btn mui-btn--small mui-btn--fab mui-btn--danger"
        @click="handle_selected('delete')"
      >
        <font-awesome-icon icon="trash"></font-awesome-icon>
      </button>
      <button
        class="mui-btn mui-btn--small mui-btn--fab"
        @click="handle_selected('star')"
      >
        <font-awesome-icon icon="star"></font-awesome-icon>
      </button>
      <button
        class="mui-btn mui-btn--small mui-btn--fab"
        @click="handle_selected('group')"
      >
        <font-awesome-icon icon="users"></font-awesome-icon>
      </button>
      <button
        class="mui-btn mui-btn--small mui-btn--fab"
        @click="handle_selected('tag')"
      >
        <font-awesome-icon icon="tag"></font-awesome-icon>
      </button>
    </div>
  </div>
</template>
    
<script>
import api from "../api";
import ParamInput from "./ParamInput.vue";
import GalleryImageInfo from "./GalleryImageInfo.vue";
import querystring from 'querystring'
import stringhash from 'string-hash'

export default {
  components: { ParamInput, GalleryImageInfo },
  name: "Gallery",
  data() {
    return {
      galleries: [],
      selected_gallery: "",
      sort: "_id=-1",
      querystr: "",
      total: 0,
      results: [],
      loading: false,
      viewer: false,
      viewer_item: 0,
      last_select: null,
    };
  },
  created() {
    const component = this;
    this.handler = function (e) {
      component.$emit("keyup", e);
    };
    window.addEventListener("keyup", this.keyup);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.keyup);
  },
  computed: {
    viewer_image() {
      return this.viewer ? this.results[this.viewer_item || 0] : false;
    },
    selected() {
      return this.results.filter((r) => r.selected);
    },
  },
  mounted() {
    var params = querystring.parse(location.search.slice(1))
    console.log(params)
    if (params.q) {
      this.querystr = params.q
      this.selected_gallery = params.gallery
      this.sort = params.sort
    }
    api.call("meta").then((data) => {
      this.galleries = data.result.galleries;
    });
    this.load_more();
  },
  methods: {
    load_more() {
      if (this.loading) return;
      this.loading = true;
      var query = "??match((" + this.querystr + ")&image_storage!=())";
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
            if (typeof x.image_storage !== 'object')
              return x
          
            if (x.image_storage.blocks)
              x.image_src = "image?file=blocks.h5&id=" + (x.image_storage.blocks === true ? x._id : x.image_storage.blocks);
            else if (x.image_storage.pdf)
              x.image_src =
                "image?file=" + x.source.file + "&page=" + x.source.page;
            else x.image_src = 'image'
          
            if (x.image_src) {
              api.blob(x.image_src).then((u) => (x.image_src = u)).catch(() => {x.image_src = x.image_storage.url || ''});
            }
            if (x.image_storage.url && x.image_storage.url.match(/\.(mp4|avi)$/)) x.is_video = true;
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
    jump_to(obj) {
      if (typeof obj !== "string") obj = api.querify(obj);
      obj = querystring.stringify({
        q: obj,
        gallery: this.selected_gallery,
        sort: this.sort
      })
      const hash = stringhash(obj)
      this.$router.push("/gallery/" + hash + '?' + obj);
    },
    select_image(e) {
      var start = e, end = e + 1;
      if (this.last_select !== null && e.shiftKey) {
        start = Math.min(this.last_select, e)
        end = Math.max(this.last_select, e)
      }
      for (var i = start ; i < end; ++i)
        this.results[i].selected = !this.results[i].selected;
      this.$forceUpdate();
      this.last_select = e
    },
    // viewer
    view(e) {
      this.viewer = true;
      this.viewer_item = e;
      this.viewer_image.selected = true;
    },
    prev() {
      this.viewer_image.selected = false;
      if (this.viewer && this.viewer_item > 0) this.viewer_item--;
      this.viewer_image.selected = true;
    },
    next() {
      this.viewer_image.selected = false;
      if (this.viewer && this.viewer_item < this.results.length - 1)
        this.viewer_item++;
      this.viewer_image.selected = true;
    },
    // keyup shortcuts
    keyup(e) {
      if (this.viewer) {
        switch (e.key) {
          case "ArrowLeft":
            this.prev();
            break;
          case "ArrowRight":
            this.next();
            break;
          case "Escape":
            this.viewer = false;
            break;
        }
      }
      switch (e.key) {
        case "d":
          this.handle_selected("delete");
          break;
        case "a":
          this.handle_selected("star");
          break;
        case "g":
          this.handle_selected("group");
          break;
        case "t":
          this.handle_selected("tag");
          break;
        case "f":
          this.results.map((x) => {
            x.selected = !x.selected;
          });
          this.$forceUpdate();
          break;
      }
    },
    swipe_handler(direction) {
      if (document.getSelection().toString()) return;
      switch (direction) {
        case "right":
          this.prev()
          break;

        case "left":
          this.next()
          break;
      }
    },
    // handle_selected
    clear_selected() {
      this.selected.map((x) => (x.selected = false));
      this.$forceUpdate()
    },
    handle_selected(type) {
      if (this.selected.length == 0) return;
      switch (type) {
        case "delete":
          if (
            true ==
            confirm("确定要删除这些图片吗：\n" + this.selected.map(x=>x._id).join(","))
          ) {
            var selected = this.selected.concat()
            api
              .call("gallery/delete", {
                selected: selected.map((x) => x._id),
              })
              .then(() => {
                selected.map((x) => {
                  this.results.splice(this.results.indexOf(x), 1);
                });
              });
          }
          break;
        case "star":
          api
            .call("gallery/star", { selected: this.selected.map((x) => x._id) })
            .then(() => {
              this.selected.map((x) => {
                x.rating = (0 | x.rating) + 1;
              });
              this.clear_selected();
            });
          break;
        case "tag":
          var tag = prompt("请输入标签：");
          if (tag) {
            tag = tag.split(",");
            api
              .call("gallery/tag", {
                selected: this.selected.map((x) => x._id),
                tag
              })
              .then(() => {
                this.selected.map((x) => {
                  x.keywords = x.keywords.concat(tag);
                });
                this.clear_selected();
              });
          }
          break;
        case "group":
          api
            .call("gallery/group", {
              selected: this.selected.map((x) => x._id),
            })
            .then((data) => {
              this.selected.map((x) => {
                x.groups = [data.result];
              });
              this.clear_selected();
            });
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

.item {
  margin-left: 15px;
  padding: 15px;
  position: relative;
}

.item img {
  width: 100%;
  display: block;
}

.viewer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 5;
  background: rgba(255, 255, 255, 0.5);
  width: 100%;
  height: 100vh;
}

.viewer .text a:focus {
  background: #fff;
  color: #000;
  bottom: 0px;
}

.viewer {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: auto;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
  text-align: center;
  color: #fff;
  overflow: hidden;
  padding-bottom: 20px;
}

.viewer .close {
  position: fixed;
  z-index: 11;
  right: 10px;
  top: 10px;
}

.viewer .close svg {
  fill: #fff;
  width: 32px;
  height: 32px;
}

.viewer img {
  height: 100vh;
  width: auto;
}

.viewer .text-wrapper {
  position: fixed;
  background: rgba(0, 0, 0, 0.5);
  text-align: left;
  opacity: 0;
  display: table;
  bottom: 0px;
  right: 0;
  width: 200px;
  height: 100%;
}

.viewer .text-wrapper:hover {
  opacity: 1;
}

.viewer .text-wrapper span {
  display: block;
}

.viewer .text {
  width: 100%;
  display: table-cell;
  vertical-align: bottom;
  word-break: break-all;
  padding-bottom: 60px;
}

.actions {
  position: fixed;
  bottom: 15px;
  right: 15px;
  z-index: 10;
}

.actions > * {
  float: right;
  margin-left: 15px;
}

.top-right-icon {
  border-radius: 20px;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  color: #fff;
  position: absolute;
  top: 0px;
  right: 0px;
}
</style>
