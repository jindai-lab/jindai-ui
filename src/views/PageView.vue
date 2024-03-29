<template>
  <v-sheet v-touch="{
    left: () => _event_handler('left'),
    right: () => _event_handler('right'),
    down: () => do_close(),
    up: () => $emit('rating', { inc: 1 }),
  }" @wheel="_wheel_handler" :style="view_mode == 'gallery' ? { overflow: 'hidden', height: '100%' } : {}"
    v-if="active_paragraph">
    <!-- operation buttons -->
    <v-row v-if="view_mode == 'file'" class="pt-3">
      <v-col class="heading">
        <h3>{{ file }} &nbsp;</h3>
      </v-col>
      <v-spacer></v-spacer>
      <v-btn icon @click="_event_handler('right')" :enabled="page > 0">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-text-field dense flat type="number" style="max-width: 50px" :value="page" @input="try_page"></v-text-field>
      <v-btn icon @click="_event_handler('left')">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </v-row>
    <v-btn v-else icon @click="do_close()" class="ma-10" fab fixed top right><v-icon>mdi-close</v-icon></v-btn>

    <!-- main view -->
    <template v-if="view_mode == 'gallery'">
      <!-- gallery view, use image or video player -->
      <div class="browser">
        <video-player :src="api.get_item_video(active_item)" :options="{
          muted: false,
          autoplay: true,
          style: {
            width: '100%',
            height: '100vh',
            overflow: 'hidden',
            top: 0,
            left: 0,
          },
        }" class="video-player" ref="videoPlayer" v-if="active_item && ['video', 'audio'].includes(active_item.item_type)
  " />
        <image-player :src="active_item
          ? api.get_item_image(active_item)
          : (_event_handler('continue'), '')
          " :fit="api.config.fit" class="image-player" ref="imagePlayer" v-else />
        <div class="browsing description">
          <v-row align="end">
            <v-col cols="2">
              <ol ref="thumbnails" v-show="active_paragraph && active_paragraph_images.length > 1">
                <li v-for="thumbnail in active_paragraph_images" :key="thumbnail._id"
                  :class="{ selected: active_item._id == thumbnail._id }">
                  <img :src="api.get_item_image(thumbnail)" alt="" />
                </li>
              </ol>
              <v-pagination v-model="browsing_page" :length="3" :total-visible="0" @previous="
                browsing_page = 2;
              _event_handler('arrowleft');
              " @next="
  browsing_page = 2;
_event_handler('arrowright');
"></v-pagination>
            </v-col>
            <v-col cols="10" class="item-description" v-if="active_item">
              <v-row class="mt-3 mb-3">
                <div class="mr-3" v-if="typeof active_item.rating == 'number'">
                  <v-rating style="display: inline-block" v-model="active_item.rating" background-color="white"
                    color="yellow accent-4" half-increments hover size="18"
                    @input="$emit('rating', { val: $event })"></v-rating>
                  <span class="grey--text text--lighten-2">({{ active_item.rating.toFixed(1) }})
                  </span>
                </div>
                <div>
                  <v-btn v-for="(filter, page_name) in plugin_pages.filter(
                    (x) => x.format
                  )" :key="page_name" icon dense :href="'/' +
  api.querystring_stringify({
    q:
      api.scope(active_paragraph) +
      `;plugin(${format(filter.format, {
        mediaitem: active_item,
        paragraph: active_paragraph,
      })});`,
  })
  " class="t_func sim" target="_blank"><v-icon>{{ filter.icon }}</v-icon></v-btn>
                  <v-btn icon dense @click="$emit('info', active_item)" target="_blank"
                    data-keybind="i"><v-icon>mdi-information</v-icon></v-btn>
                </div>
              </v-row>
              <GalleryContentView class="browsing-content" :paragraph="active_paragraph"
                view_mode="gallery-description" />
            </v-col>
          </v-row>
        </div>
      </div>
    </template>
    <template v-else-if="active_paragraph && active_paragraph.source">
      <v-row v-if="image_type == 'pdf'">
        <vue-pdf-embed :source="page_image" />
      </v-row>
      <v-row class="main">
        <div class="paragraphs">
          <div v-html="html" class="original-html"></div>
          <div v-for="p in shown_paragraphs" :key="p._id">
            <ContentView :paragraph="p" item_width="100%" :view_mode="view_mode" />
          </div>
          <div class="mt-5 meta" v-if="active_paragraph">
            {{ $t("date") }}: {{ active_paragraph.pdate | dateSafe }}<br />
            {{ $t("pagenum") }}: {{ active_paragraph.pagenum }}
            <v-btn icon small @click="edit_pagenum
              "><v-icon small>mdi-form-textbox</v-icon></v-btn>
            <br />
            {{ $t("outline") }}: {{ active_paragraph.outline }}<br />
            {{ $t("source") }}:
            <a :href="active_paragraph.source.url" v-if="active_paragraph.source.url" target="_blank">{{
              active_paragraph.source.url }}</a>
            {{ active_paragraph.source.file }}
            {{ active_paragraph.source.page }}<br />
          </div>
        </div>
        <div class="image" @click="show_modal = image_type != 'pdf' && !!page_image" v-if="image_type != 'pdf'">
          <img :src="page_image" alt="" @load="
            $event.target.style.height =
            window_height - $event.target.offsetTop - 20 + 'px'
            " />
        </div>
      </v-row>
    </template>
  </v-sheet>
</template>

<script>
import ContentView from "../components/ContentView.vue";
import ImagePlayer from "../components/ImagePlayer.vue";
import VideoPlayer from "../components/VideoPlayer.vue";
import GalleryContentView from "../components/GalleryContentView.vue";
import VuePdfEmbed from 'vue-pdf-embed/dist/vue2-pdf-embed'
import dialogs from '../dialogs'
import axios from "axios";

export default {
  name: "PageView",
  components: {
    ContentView,
    ImagePlayer,
    VideoPlayer,
    GalleryContentView,
    VuePdfEmbed
  },
  data() {
    return {
      file: "",
      page: 0,
      page_image: "",
      image_type: "",
      show_modal: false,
      pagenum_edit: false,
      html: "",

      fetched_paragraphs: [],
      mongocollection: "paragraph",
      loading_image: require("../../public/assets/loading.png"),
      item_index: 0,
      highlight_pattern: '',
      pending_status: 0,

      playing_timer: 0,
      playing_interval: 1000,
      last_inc: 1,
      last_wheel: new Date(),
      plugin_pages: this.business.plugin_pages,
      browsing_page: 2,

      emphasis_index: -1,
    };
  },
  props: {
    view_mode: {
      default: "file",
    },
    paragraphs: {
      default: () => [],
    },
    value: {
      default: 0,
    },
    path: {
      default: "",
    },
  },
  computed: {
    window_height() {
      return window.innerHeight;
    },
    active_paragraph() {
      var paragraph = { images: [] };
      if (this.view_mode == "file") paragraph = Object.assign(paragraph, this.fetched_paragraphs[0]);
      else paragraph = Object.assign(paragraph, this.paragraphs[this.value]);
      this.$emit("browse", { paragraph });
      return paragraph;
    },
    active_item() {
      var item = this.active_paragraph_images[this.item_index];
      if (!item)
        this._event_handler('continue')
      this.$emit("browse", { item });
      if (this.$refs.thumbnails && this.$refs.thumbnails.querySelector("li.selected")) {
        this.$refs.thumbnails.querySelector("li.selected").scrollIntoView();
      }
      return item;
    },
    shown_paragraphs() {
      return this.view_mode !== "file"
        ? [this.active_paragraph]
        : this.fetched_paragraphs;
    },
    active_paragraph_images() {
      return this.active_paragraph.images
    },
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this._event_handler);
  },
  created() {
    window.addEventListener("keyup", this._event_handler);
  },
  mounted() {
    if (this.path) {
      let params = window.location.pathname.split("/");
      if (!params.includes("view")) return;
      params = params.slice(params.indexOf("view") + 1);
      this.mongocollection = params[0];
      if (params.length > 2) {
        this.file = decodeURIComponent(params.slice(1, -1).join("/"));
        this.page = +params.slice(-1)[0];
      }
    }
    if (window.location.hash) {
      Object.assign(this, this.api.querystring_parse(window.location.hash.substring(1)))
    }

    this.update_image();
  },
  watch: {
    paragraphs() {
      if (this.pending_status == -1) {
        this.$emit('input', this.paragraphs.length - 1);
        if (this.view_mode == "gallery")
          this.item_index = this.paragraphs.slice(-1)[0].images.length - 1;
      } else {
        this.$emit('input', 0)
        this.item_index = 0;
      }
      this.pending_status = 0;
    },
    value(val) {
      if (typeof val === 'string') {
        val = +val
        this.item_index = 0
        this.$emit('input', val)
      }
    },
  },
  methods: {
    _wheel_handler(e) {
      if (this.view_mode !== "gallery" || e.ctrlKey) return;
      e.preventDefault();
      if (new Date() - this.last_wheel > 100) {
        this._event_handler(e.deltaY > 0 ? "arrowright" : "arrowleft");
        this.last_wheel = new Date();
      }
    },
    reset_item_index() {
      this.item_index = -1;
      this._event_handler('right')
    },
    apply_fit() {
      if (this.view_mode == "gallery" && this.active_item && this.$refs.imagePlayer)
        this.$refs.imagePlayer.update();
    },
    update_image() {
      if (this.view_mode == "file" && this.file) {
        var path = location.href.split("/");
        path.pop();
        path.push("" + this.page);
        history.pushState(null, null, path.join("/") + window.location.hash);
      }
      this.page_image = this.loading_image;
      this.image_type = 'png';

      if (this.view_mode == "file" && this.file) {
        let source = {}
        if (this.file.startsWith('remote-')) {
          this.file = this.file.replace(/^remote-/, '').replace('/', '://').replace('__ends', '/')
          source.url = this.file
        } else {
          source.file = '/' + this.file
          source.page = this.page
        }
        this.business.search({
          req:
            this.api.querify({ source }),
          sort: 'id',
          q: '',
          mongocollections: [this.mongocollection],
        })
          .then((data) => {
            this.fetched_paragraphs = data.results.sort((a, b) => a._id.localeCompare(b._id)).map(x =>
              ({ ...x, matched_content: this.api.emphasize(x.content, this.highlight_pattern) }));
            if (!data.results.length) {
              this.fetched_paragraphs = [
                {
                  source: {
                    file: this.file,
                    page: this.page,
                  },
                  keywords: [],
                  content: "",
                  _id: "",
                },
              ];
            }
          });
      }

      var src =
        this.view_mode == "file"
          ? '/images/file/' + this.file + `__hash/pdf/${this.page}/page.pdf`
          : this.active_paragraph.src;
      if (src) {
        var image_url = this.api.get_image_url(src);
        this.image_type = src.split('.').pop().toLowerCase()
        switch (this.image_type) {
          case 'pdf':
            this.page_image = image_url
            break
          case 'htm':
          case 'html':
            if (this.view_mode == 'file' || !this.active_paragraph.html) {
              axios.get(image_url).then(html =>
                this.html = this.api.emphasize(html.data, this.highlight_pattern))
            } else {
              this.html = this.api.emphasize(this.active_paragraph.html, this.highlight_pattern)
            }
            this.page_image = ''
            break
          default:
            var image_element = new Image();
            image_element.src = image_url;
            image_element.onload = () => {
              this.page_image = image_element.src;
            }
            break
        }
      }
    },
    scroll_emphasis(inc = 1) {
      const ems = document.querySelectorAll('em')
      this.emphasis_index = (this.emphasis_index + inc) % ems.length
      ems[this.emphasis_index].scrollIntoView()
    },
    playing(interval) {
      if (this.view_mode !== "gallery") return;
      if (interval) this.playing_interval = interval;
      this.playing_timer = setInterval(() => {
        this._event_handler("arrowright");
      }, this.playing_interval);
    },
    _event_handler(direction) {

      if (document.getSelection().toString().trim()) return;

      if (typeof direction !== "string") {
        // key stroke
        const e = direction;
        if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;
        if (this.playing_timer) clearInterval(this.playing_timer);
        direction = e.key.toLowerCase();
        if (e.shiftKey) direction += "shift";
      }

      var inc = 0;
      switch (direction) {
        case "right":
        case "arrowleft":
          inc = -1;
          break;
        case "left":
        case "arrowright":
          inc = 1;
          break;
        case "arrowleftshift":
          inc = -this.item_index - 1;
          break;
        case "arrowrightshift":
          inc = this.active_paragraph_images.length - this.item_index;
          break;
        case "continue":
          inc = this.last_inc;
          break;
        case "g":
          document.querySelector(".browsing.description a.t_group").click();
          break;
        case "j":
          this.scroll_emphasis(1)
          break
        case "k":
          this.scroll_emphasis(-1)
          break;
        case "enter":
          this.playing();
          break;
        default:
          var btn = document.querySelector(`[data-keybind="${direction}"]`);
          if (btn) btn.click();
          break;
      }

      if (inc == 0) return;
      this.last_inc = Math.sign(inc);

      if (this.view_mode == 'file') {
        this.page = +this.page + inc;
        this.update_image();
        return;
      }

      if (this.view_mode == 'gallery') {
        var newvalue = +this.value, newitem = this.item_index + inc

        if (newitem < 0 || newitem >= this.paragraphs[newvalue].images.length) {
          newvalue += inc;
        }

        const _valid = () => {
          return this.paragraphs[newvalue] && this.paragraphs[newvalue].images.length
        }

        while (!_valid() && newvalue >= 0 && newvalue < this.paragraphs.length) {
          newvalue += inc
        }

        if (newvalue < 0 || newvalue >= this.paragraphs.length) {
          this.$emit(inc < 0 ? "prev" : "next");
          newvalue = 0;
          newitem = newvalue
          this.pending_status = inc
        } else if (newvalue != this.value) {
          if (inc < 0) newitem = this.paragraphs[newvalue].images.length - 1;
          else if (inc > 0) newitem = 0
        }
        
        this.$emit('input', newvalue)
        this.item_index = newitem
      }

    },
    try_page(e) {
      e = e | 0;
      this.page = e;
      this.update_image();
    },
    edit_pagenum() {
      dialogs.pagenum({ pagenum: this.active_paragraph.pagenum }).then(pagenum_editor => {
        if (pagenum_editor)
          this.business.edit_paragraph_pagenum(this.mongocollection, this.active_paragraph._id, pagenum_editor);
      })
    },
    format(str, bundle) {
      function _replace(_, i) {
        var b = bundle;
        for (var k of i.split(".")) b = b[k] || "";
        return b;
      }
      return (typeof str == "string" && str.replace(/\{([\w\d._]+)\}/g, _replace)) || "";
    },
    do_close() {
      this.$emit('close')
    }
  },
};
</script>

<style scoped>
.paragraphs {
  line-height: 200%;
}

.main>div {
  width: 100%;
}

@media screen and (min-width: 800px) {
  .main>div {
    width: 50%;
  }
}

.browsing {
  overflow: hidden;
}

.close {
  position: absolute;
  z-index: 400;
  right: 30px;
  top: 30px;
  border-radius: 20px;
  border: 0px;
  background: rgba(255, 255, 255, 0.5);
}

.theme--dark .close {
  background: rgba(0, 0, 0, 0.5);
}

.white-bg {
  background: white;
}

.description {
  border: hidden;
  background: none;
  box-shadow: none !important;
  position: fixed;
  bottom: 0;
}

.description:hover {
  opacity: 1;
  z-index: 101;
}

.browsing-content {
  max-height: 30vh;
  overflow-y: hidden;
}

.description {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  backdrop-filter: blur(5px);
  background-color: rgba(255, 255, 255, 0.5);
  opacity: 0;
}

.theme--dark .description {
  background-color: rgba(0, 0, 0, 0.5);
}

.browsing.description ol {
  list-style: none;
  overflow-y: scroll;
  white-space: nowrap;
}

.browsing.description ol::-webkit-scrollbar {
  height: 0px;
}

.browsing.description li {
  max-width: 80px;
  height: 80px;
  display: inline-block;
  margin: 1px;
  border: 2px solid gray;
  overflow: hidden;
}

.browsing.description li.selected {
  border: 2px solid white;
}

.browsing.description li>img {
  max-height: 80px;
}

.vue-pdf-embed {
  width: 100%;
}

.row>.paragraphs {
  margin: 20px;
}

.browser {
  overflow: hidden;
}
</style>
