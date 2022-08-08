<template>
  <v-dialog :value="value" fullscreen persistent class="white-bg">
    <v-card
      flat
      v-touch="{
        left: () => _event_handler('left'),
        right: () => _event_handler('right'),
        down: () => $emit('input', false),
        up: () => $emit('rating', { item: active_item, inc: 1 }),
      }"
      @wheel="_wheel_handler"
      :style="
        view_mode == 'gallery' ? { overflow: 'hidden', height: '100%' } : {}
      "
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
          <!-- gallery view, image browser -->
          <div v-else>
            <ImageBrowsing
              :paragraph="active_paragraph"
              :item="active_item"
              v-if="value"
              @info="$emit('info', $event)"
              @browse="_event_handler"
            />
          </div>

          <!-- edit dialogs -->
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
import api from "../api";
import ParamInput from "../components/ParamInput.vue";
import ContentView from "../components/ContentView.vue";
import ImageBrowsing from "../components/ImageBrowsing.vue";

export default {
  name: "PageView",
  components: {
    ParamInput,
    ContentView,
    ImageBrowsing,
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
      if (this.view_mode == "file") return this.fetched_paragraphs[0];
      else return Object.assign({}, this.paragraphs[this.paragraph_index]);
    },
    active_item() {
      return (this.active_paragraph_images || [])[this.item_index];
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
    if (!this.paragraph) {
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
      if (this.view_mode !== "gallery") return;
      this._event_handler(e.deltaY > 0 ? "arrowright" : "arrowleft");
      e.preventDefault();
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
        api
          .call("quicktask", {
            query:
              "?" +
              api.querify(
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
        var image_url = `/api/image${api.querystring_stringify(src)}`;
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
      if (interval) this.playing_interval = interval;
      this.playing_timer = setInterval(() => {
        this._event_handler("arrowright");
      }, this.playing_interval);
    },
    _event_handler(direction) {
      if (document.getSelection().toString() || !this.value) return;
      if (typeof direction !== "string") {
        // key stroke
        const e = direction;
        if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA")
          return;
        if (this.playing_timer) clearInterval(this.playing_timer);
        direction = e.key.toLowerCase();
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
      this.last_inc = inc;

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
      api.call(
        `collections/${this.mongocollection || "paragraph"}/${
          this.active_paragraph._id
        }/pagenum`,
        this.pagenum_editor
      );
      this.pagenum_edit = false;
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
  position: fixed;
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
</style>