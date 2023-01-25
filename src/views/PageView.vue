<template>
  <v-dialog
    :value="value"
    :fullscreen="view_mode == 'file' || view_mode == 'gallery'"
    persistent
    class="white-bg"
  >
    <v-card
      flat
      v-touch="{
        left: () => _event_handler('left'),
        right: () => _event_handler('right'),
        down: () => $emit('input', false),
        up: () => $emit('rating', { inc: 1 }),
      }"
      @wheel="_wheel_handler"
      :style="
        view_mode == 'gallery' ? { overflow: 'hidden', height: '100%' } : {}
      "
      v-if="active_paragraph"
    >
      <v-card-text>
        <!-- operation buttons -->
        <v-row v-if="view_mode == 'file'" class="pt-3">
          <v-col class="heading">
            <h3>{{ file }} &nbsp;</h3>
          </v-col>
          <v-spacer></v-spacer>
          <v-btn icon @click="_event_handler('right')" :enabled="page > 0">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <v-text-field
            dense
            flat
            type="number"
            style="max-width: 50px"
            :value="page"
            @input="try_page"
          ></v-text-field>
          <v-btn icon @click="_event_handler('left')">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </v-row>
        <v-btn v-else icon @click="$emit('input', false)" class="close"
          ><v-icon>mdi-close</v-icon></v-btn
        >

        <!-- main view -->
        <template v-if="active_paragraph && active_paragraph.source">
          <v-row class="main" v-if="view_mode !== 'gallery'">
            <div class="paragraphs">
              <div v-for="p in shown_paragraphs" :key="p._id">
                <ContentView
                  :paragraph="p"
                  item_width="100%"
                  :view_mode="view_mode"
                />
              </div>
              <div class="mt-5 meta" v-if="active_paragraph">
                {{ $t("date") }}: {{ active_paragraph.pdate | dateSafe }}<br />
                {{ $t("pagenum") }}: {{ active_paragraph.pagenum }}
                <v-btn
                  icon
                  small
                  @click="
                    pagenum_editor.new_pagenum = active_paragraph.pagenum;
                    pagenum_edit = true;
                  "
                  ><v-icon small>mdi-form-textbox</v-icon></v-btn
                >
                <br />
                {{ $t("outline") }}: {{ active_paragraph.outline }}<br />
                {{ $t("source") }}:
                <a
                  :href="active_paragraph.source.url"
                  v-if="active_paragraph.source.url"
                  target="_blank"
                  >{{ active_paragraph.source.url }}</a
                >
                {{ active_paragraph.source.file }}
                {{ active_paragraph.source.page }}<br />
              </div>
            </div>
            <div class="image" @click="show_modal = !!pdf_image">
              <img
                :src="pdf_image"
                alt=""
                @load="
                  $event.target.style.height =
                    window_height - $event.target.offsetTop - 20 + 'px'
                "
              />
            </div>
          </v-row>
          <!-- gallery view, use image or video player -->
          <div class="browser" v-else>
            <video-player
              :src="api.get_item_video(active_item)"
              :options="{
                muted: false,
                autoplay: true,
                style: {
                  width: '100%',
                  height: '100vh',
                },
              }"
              class="video-player"
              ref="videoPlayer"
              v-if="active_item && active_item.item_type != 'image'"
            />
            <image-player
              :src="active_item ? api.get_item_image(active_item) : (_event_handler('continue'), '')"
              :fit="api.config.fit"
              class="image-player"
              ref="imagePlayer"
              v-else
            />
            <div class="browsing description">
              <v-row align="end">
                <v-col cols="2">
                  <v-pagination
                    v-model="browsing_page"
                    :length="3"
                    :total-visible="0"
                    @previous="browsing_page = 2; _event_handler('arrowleft')"
                    @next="browsing_page = 2; _event_handler('arrowright')"
                  ></v-pagination>
                </v-col>
                <v-col cols="10" class="item-description" v-if="active_item">
                  <v-row class="mt-3 mb-3">
                    <div class="mr-3" v-if="typeof active_item.rating == 'number'">
                      <v-rating
                        style="display: inline-block"
                        v-model="active_item.rating"
                        background-color="white"
                        color="yellow accent-4"
                        half-increments
                        hover
                        size="18"
                        @input="$emit('rating', { val: $event })"
                      ></v-rating>
                      <span class="grey--text text--lighten-2"
                        >({{ active_item.rating.toFixed(1) }})
                      </span>
                    </div>
                    <div>
                      <v-btn
                        v-for="(filter, page_name) in plugin_pages.filter(
                          (x) => x.format
                        )"
                        :key="page_name"
                        icon
                        dense
                        :href="
                          '/' +
                          api.querystring_stringify({
                            q:
                              api.scope(active_paragraph) +
                              `;plugin('${format(filter.format, {
                                mediaitem: active_item,
                                paragraph: active_paragraph,
                              })}');`,
                          })
                        "
                        class="t_func sim"
                        target="_blank"
                        ><v-icon>{{ filter.icon }}</v-icon></v-btn
                      >
                      <v-btn
                        icon
                        dense
                        @click="$emit('info', active_item)"
                        target="_blank"
                        data-keybind="i"
                        ><v-icon>mdi-information</v-icon></v-btn
                      >
                    </div>
                  </v-row>
                  <GalleryContentView
                    class="browsing-content"
                    :paragraph="active_paragraph"
                    view_mode="gallery-description"
                  />
                </v-col>
              </v-row>
            </div>
          </div>

          <!-- fullscreen image view -->
          <v-dialog v-model="show_modal" fullscreen>
            <v-btn
              fab
              fixed
              icon
              top
              right
              class="ma-10"
              @click="show_modal = false"
              ><v-icon>mdi-close</v-icon></v-btn
            >
            <img :src="pdf_image" alt="" style="width: 100%" ref="image" />
          </v-dialog>

          <!-- pagenum edit -->
          <v-dialog v-model="pagenum_edit" width="unset">
            <v-card>
              <v-card-title
                >{{ $t("edit-pagenum") }}
                <v-spacer></v-spacer>
                <v-btn icon @click="pagenum_edit = false"
                  ><v-icon>mdi-close</v-icon></v-btn
                >
              </v-card-title>
              <v-card-text>
                <v-sheet>
                  <ParamInput
                    :arg="{ name: $t('pagenum'), type: 'int' }"
                    v-model="pagenum_editor.new_pagenum"
                  />
                  <ParamInput
                    :arg="{
                      name: $t('modify-mode'),
                      type: $t('pagenum-modes'),
                    }"
                    v-model="pagenum_editor.sequential"
                  />
                  <ParamInput
                    :arg="{ name: $t('folio-mode'), type: 'bool' }"
                    v-model="pagenum_editor.folio"
                  />
                </v-sheet>
              </v-card-text>
              <v-card-actions>
                <v-btn color="primary" @click="save_pagenum">{{
                  $t("ok")
                }}</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import ParamInput from "../components/ParamInput.vue";
import ContentView from "../components/ContentView.vue";
import ImagePlayer from "../components/ImagePlayer.vue";
import VideoPlayer from "../components/VideoPlayer.vue";
import GalleryContentView from "../components/GalleryContentView.vue";

export default {
  name: "PageView",
  components: {
    ParamInput,
    ContentView,
    ImagePlayer,
    VideoPlayer,
    GalleryContentView
  },
  data() {
    return {
      file: "",
      page: 0,
      pdf_image: "",
      show_modal: false,
      pagenum_edit: false,
      pagenum_editor: {
        new_pagenum: 0,
        sequential: "all",
        folio: false,
      },

      fetched_paragraphs: [],
      mongocollection: "paragraph",
      loading_image: require("../../public/assets/loading.png"),
      paragraph_index: 0,
      item_index: 0,

      playing_timer: 0,
      playing_interval: 1000,
      last_inc: 1,
      last_wheel: new Date(),
      plugin_pages: this.business.plugin_pages,
      browsing_page: 2,
    };
  },
  props: {
    view_mode: {
      default: "file",
    },
    paragraphs: {
      default: () => [],
    },
    start_index: {
      default: 0,
    },
    value: {
      default: true,
    },
  },
  computed: {
    window_height() {
      return window.innerHeight;
    },
    active_paragraph() {
      var paragraph = {};
      if (this.view_mode == "file") paragraph = this.fetched_paragraphs[0];
      else paragraph = Object.assign({}, this.paragraphs[this.paragraph_index]);
      this.$emit("browse", { paragraph });
      return paragraph;
    },
    active_item() {
      var item = (this.active_paragraph_images || [])[this.item_index];
      this.$emit("browse", { item });
      return item;
    },
    shown_paragraphs() {
      return this.view_mode !== "file"
        ? [this.active_paragraph]
        : this.fetched_paragraphs;
    },
    active_paragraph_images() {
      if (
        this.active_paragraph &&
        this.active_paragraph.images &&
        this.active_paragraph.images.length
      )
        return this.active_paragraph.images;
      if (
        this.active_paragraph &&
        this.active_paragraph.source &&
        this.active_paragraph.source.file &&
        this.active_paragraph.source.file.endsWith(".pdf")
      )
        return [this.active_paragraph];
      return [];
    },
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this._event_handler);
  },
  created() {
    window.addEventListener("keyup", this._event_handler);
  },
  mounted() {
    this.$el.focus();
    if (!this.paragraphs) {
      let params = window.location.href.split("/");
      if (!params.includes("view")) return;
      params = params.slice(params.indexOf("view") + 1);
      this.mongocollection = params[0];
      if (params.length > 2) {
        this.file = decodeURIComponent(params.slice(1, -1).join("/"));
        this.page = +params.slice(-1)[0];
      }
    }
    this.update_pdfpage();
  },
  watch: {
    value(val) {
      if (val) {
        this.paragraph_index = this.start_index;
        this.item_index = 0;
        this.update_pdfpage();
      } else {
        if (this.playing_timer) window.clearInterval(this.playing_timer);
      }
    },
    paragraphs() {
      if (this.paragraph_index < 0) {
        this.paragraph_index = this.paragraphs.length - 1;
        if (this.view_mode == "gallery")
          this.item_index = this.paragraphs.slice(-1)[0].images.length - 1;
      }
    },
  },
  methods: {
    _wheel_handler(e) {
      e.preventDefault();
      if (this.view_mode !== "gallery" || e.ctrlKey) return;
      if (new Date() - this.last_wheel > 100) {
        this._event_handler(e.deltaY > 0 ? "arrowright" : "arrowleft");
        this.last_wheel = new Date();
      }
    },
    apply_fit() {
      if (this.view_mode == "gallery" && this.active_item && this.$refs.imagePlayer)
        this.$refs.imagePlayer.update();
    },
    update_pdfpage() {
      if (this.view_mode == "file" && this.file) {
        var path = location.href.split("/");
        path.pop();
        path.push("" + this.page);
        history.pushState(null, null, path.join("/"));
      }
      this.pdf_image = this.loading_image;

      if (this.view_mode == "file" && this.file) {
        this.api
          .call("quicktask", {
            query:
              "?" +
              this.api.querify(
                this.paragraph_id
                  ? { id: this.paragraph_id }
                  : { source: { file: this.file, page: this.page } }
              ),
            mongocollection: this.mongocollection,
          })
          .then((data) => {
            this.fetched_paragraphs = data.result;
            if (!data.result.length) {
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
          ? { file: this.file, page: this.page }
          : this.active_paragraph.source;
      if (src && src.file && typeof src.page !== "undefined") {
        var image_url = this.api.get_image_url(src);
        var image_element = new Image();
        image_element.src = image_url;
        image_element.onload = () => {
          this.pdf_image = image_element.src;
        };
      } else {
        this.pdf_image = "";
      }
    },
    playing(interval) {
      if (this.view_mode !== "gallery") return;
      if (interval) this.playing_interval = interval;
      this.playing_timer = setInterval(() => {
        this._event_handler("arrowright");
      }, this.playing_interval);
    },
    _event_handler(direction) {
      if (document.getSelection().toString().trim() || !this.value) return;

      if (typeof direction !== "string") {
        // key stroke
        const e = direction;
        if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA")
          return;
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

      const _paragraph = (inc) => {
        // paragraph
        if (
          this.paragraph_index + inc >= 0 &&
          this.paragraph_index + inc < this.paragraphs.length
        ) {
          this.paragraph_index += inc;
          if (this.item_index < 0)
            this.item_index = this.active_paragraph_images.length - 1;
          else this.item_index = 0;
          if (
            this.view_mode == "gallery" &&
            (!this.active_paragraph_images ||
              this.active_paragraph_images.length == 0)
          )
            this._event_handler(direction);
        } else {
          this.$emit(inc < 0 ? "prev" : "next");
          this.paragraph_index = inc > 0 ? 0 : -1;
        }
        this.update_pdfpage();
      };

      switch (this.view_mode) {
        case "file":
          this.page = +this.page + inc;
          this.update_pdfpage();
          break;
        case "gallery":
          // previous item
          if (
            this.active_paragraph_images &&
            this.item_index + inc >= 0 &&
            this.item_index + inc < this.active_paragraph_images.length
          ) {
            this.item_index += inc;
            break;
          } else {
            this.item_index = inc > 0 ? 0 : -1;
            inc = Math.sign(inc);
          }
          _paragraph(inc);
          break;
        default:
          _paragraph(inc);
          break;
      }
    },
    try_page(e) {
      e = e | 0;
      this.page = e;
      this.update_pdfpage();
    },
    save_pagenum() {
      this.api.call(
        `collections/${this.mongocollection || "paragraph"}/${
          this.active_paragraph._id
        }/pagenum`,
        this.pagenum_editor
      );
      this.pagenum_edit = false;
    },
    format(str, bundle) {
      function _replace(_, i) {
        var b = bundle;
        for (var k of i.split(".")) b = b[k] || "";
        return b;
      }
      return (
        (typeof str == "string" && str.replace(/\{([\w\d._]+)\}/g, _replace)) ||
        ""
      );
    },
  },
};
</script>

<style scoped>
.paragraphs {
  line-height: 200%;
}

.main > div {
  width: 100%;
}

@media screen and (min-width: 800px) {
  .main > div {
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

</style>