<template>
  <v-card
    flat
    v-touch="{
      left: () => _event_handler('left'),
      right: () => _event_handler('right'),
    }"
  >
    <v-card-text>
      <v-row v-if="!view_mode">
        <v-col class="heading">
          <h3>{{ file }}</h3>
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

      <v-row class="main">
        <div class="paragraphs">
          <div v-for="p in paragraphs" :key="p._id">
            <ContentView :paragraph="p" item_width="100%" :view_mode="view_mode" />
          </div>
        </div>
        <div class="mt-5 meta" v-if="paragraphs.length > 0">
          日期: {{ paragraphs[0].pdate | dateSafe }}<br />
          页码: {{ paragraphs[0].pagenum }}
          <v-btn
            icon
            small
            @click="
              pagenum_editor.new_pagenum = paragraphs[0].pagenum;
              pagenum_edit = true;
            "
            ><v-icon small>mdi-form-textbox</v-icon></v-btn
          >
          <br />
          大纲: {{ paragraphs[0].outline }}<br />
          来源:
          <a
            :href="paragraphs[0].source.url"
            v-if="paragraphs[0].source.url"
            target="_blank"
            >{{ paragraphs[0].source.url }}</a
          >
          {{ paragraphs[0].source.file }} {{ paragraphs[0].source.page }}<br />
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
            >编辑页码
            <v-spacer></v-spacer>
            <v-btn icon @click="pagenum_edit = false"
              ><v-icon>mdi-close</v-icon></v-btn
            >
          </v-card-title>
          <v-card-text>
            <v-sheet>
              <ParamInput
                :arg="{ name: '页码', type: 'int' }"
                v-model="pagenum_editor.new_pagenum"
              />
              <ParamInput
                :arg="{
                  name: '页码',
                  type: '修改全部页面:all|只修改当前页面:solo|只修改本页之后的页面:after',
                }"
                v-model="pagenum_editor.sequential"
              />
            </v-sheet>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="save_pagenum">确定</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";
import ParamInput from "./ParamInput.vue";
import ContentView from "./ContentView.vue";

export default {
  name: "PageView",
  components: {
    ParamInput,
    ContentView,
  },
  data() {
    return {
      file: "",
      paragraph_id: "",
      page: 0,
      paragraphs: [],
      show_modal: false,
      pdf_image: "",
      pagenum_edit: false,
      pagenum_editor: {
        new_pagenum: 0,
        sequential: "all",
      },
      mongocollection: "",
      loading_image: require("../../public/assets/loading.png"),
    };
  },
  props: ["view_mode", "paragraph"],
  computed: {
    window_height() {
      return window.innerHeight;
    },
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this._event_handler);
  },
  created() {
    window.addEventListener("keyup", this._event_handler);
    if (this.paragraph) {
      this.paragraphs = [this.paragraph];
    }
  },
  mounted() {
    if (!this.paragraph) {
      let params = window.location.href.split("/");
      params = params.slice(params.indexOf("view") + 1);
      this.mongocollection = params[0];
      if (params.length > 2) {
        this.file = decodeURIComponent(params.slice(1, -1).join("/"));
        this.page = +params.slice(-1)[0];
      } else {
        this.page = 0;
        this.paragraph_id = params[1];
        this.file = "";
      }
    } else {
      this.file = this.paragraph.source.file || false;
      this.page = this.paragraph.source.page || 0;
      this.mongocollection = this.paragraph.mongocollection;
      this.paragraph_id = this.paragraph._id;
    }
    this.update_pdfpage();
  },
  watch: {
    page() {
      this.update_pdfpage();
    },
  },
  methods: {
    update_pdfpage() {
      if (!this.compact && this.file) {
        var path = location.href.split("/");
        path.pop();
        path.push("" + this.page);
        history.pushState(null, null, path.join("/"));
      }
      this.pdf_image = this.loading_image;

      if (!this.paragraph_id && !this.file) {
        this.pdf_image = "";
        return;
      }

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
          this.paragraphs = data.result;
          if (!data.result.length) {
            this.paragraphs = [
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
          if (this.paragraphs.length) {
            var p = this.paragraphs[0];
            if (p.source.file) {
              var image_url = `/api/image${api.querystring_stringify(
                p.source
              )}`;
              var image_element = new Image();
              image_element.src = image_url;
              image_element.onload = () => {
                this.pdf_image = image_element.src;
              };
            } else {
              this.pdf_image = "";
            }
          }
        });
    },
    _event_handler(direction) {
      if (document.getSelection().toString()) return;
      if (typeof direction !== 'string')
        direction = direction.key.toLowerCase();

      switch (direction) {
        case "right":
        case "arrowleft":
          if (this.view_mode) this.$emit("prev");
          else this.page = +this.page - 1;
          break;
        case "arrowright":
        case "left":
          if (this.view_mode) this.$emit("next");
          else this.page = +this.page + 1;
          break;
      }
    },
    try_page(e) {
      e = e | 0;
      this.page = e;
    },
    save_pagenum() {
      api.call(
        `edit/${this.mongocollection}/${this.paragraphs[0]._id}/pagenum`,
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
  width: 50%;
}
.browsing {
  overflow: hidden;
}
</style>