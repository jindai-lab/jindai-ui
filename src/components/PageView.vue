<template>
  <v-card flat v-touch="{left: () => swipe_handler('left'), right: () => swipe_handler('right')}">
    <v-card-text>
      <v-row v-if="!compact">
        <v-col class="heading">
           <h3>{{ file }} </h3>
        </v-col>
        <v-spacer></v-spacer>
      <v-btn icon
        @click="swipe_handler('right')"
        :enabled="page > 0"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-text-field dense flat
          type="number"
          style="max-width: 50px"
          :value="page"
          @input="try_page"
        ></v-text-field>
      <v-btn icon @click="swipe_handler('left')">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
      </v-row>
    
    <v-row>
      <v-col cols="6">
        <div class="paragraphs">
          <p v-for="p in paragraphs" :key="p._id">
            {{ p.content }}
          <v-btn class="fav-button" :color="favored(p) ? 'orange' : ''" :dark="favored(p)" icon small @click="fav(p); $forceUpdate()"><v-icon small>mdi-star</v-icon></v-btn>
          </p>
        </div>
        <div v-if="paragraphs.length > 0">
          日期: {{ paragraphs[0].pdate }}<br />
          页码: {{ paragraphs[0].pagenum }} <v-btn icon small @click="pagenum_editor.new_pagenum = paragraphs[0].pagenum; pagenum_edit = true"><v-icon small>mdi-form-textbox</v-icon></v-btn> <br />
          大纲: {{ paragraphs[0].outline }}<br />
          来源: <a :href="paragraphs[0].source.url" v-if="paragraphs[0].source.url" target="_blank">{{ paragraphs[0].source.url }}</a>
            {{ paragraphs[0].source.file }} {{ paragraphs[0].source.page }}<br>
        </div>
      </v-col>
      <v-col cols="6" class="image" @click="show_modal = true">
        <img :src="pdf_image" alt="" @load="$event.target.style.height = (window_height - $event.target.offsetTop - 20) + 'px'" />
      </v-col>
    </v-row>
    <v-dialog v-model="show_modal" fullscreen>
      <v-btn fab fixed icon top right class="ma-10" @click="show_modal = false"><v-icon>mdi-close</v-icon></v-btn>
      <img :src="pdf_image" alt="" style="width: 100%" ref="image" />
    </v-dialog>
    <v-dialog v-model="pagenum_edit" width="unset">
      <v-card>
        <v-card-title>编辑页码
          <v-spacer></v-spacer>
           <v-btn icon @click="pagenum_edit = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-card-text>
          <v-sheet>
            <ParamInput :arg="{name: '页码', type: 'int'}" v-model="pagenum_editor.new_pagenum" />
            <ParamInput :arg="{name: '页码', type: '修改全部页面:all|只修改当前页面:solo|只修改本页之后的页面:after'}" v-model="pagenum_editor.sequential" />
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
import ParamInput from "./ParamInput.vue"

export default {
  name: "PageView",
  components: {
    ParamInput
  },
  data() {
    return {
      file: '',
      paragraph_id: '',
      page: 0,
      paragraphs: [],
      show_modal: false,
      pdf_image: "",
      pagenum_edit: false,
      pagenum_editor: {
        new_pagenum: 0,
        sequential: 'all'
      },
      mongocollection: "",
      loading_image: require("../../public/assets/loading.png"),
    };
  },
  props: [
    "compact",
    "paragraph"
  ],
  computed: {
    window_height() {
      return window.innerHeight
    }
  },
  created() {
    if (!this.compact) {
      this.handler = (e) => {
        this.$emit("keyup", e);
        if (e.target.tagName == "INPUT") return;
        switch (e.key) {
          case "ArrowRight":
            this.page = +this.page + 1;
            break;
          case "ArrowLeft":
            if (+this.page > 0) this.page = +this.page - 1;
            break;
          default:
            break;
        }
      };
      window.addEventListener("keyup", this.handler);
    }
    if (this.paragraph) {
      this.paragraphs = [this.paragraph]
    }
  },
  beforeDestroy() {
    if (!this.compact) {
      window.removeEventListener("keyup", this.handler);
    }
  },
  mounted() {
    if (!this.paragraph) {
      let params = window.location.href.split("/");
      params = params.slice(params.indexOf("view") + 1);
      this.mongocollection = params[0]
      if (params.length > 2) {
        this.file = decodeURIComponent(params.slice(1, -1).join("/"));
        this.page = +params.slice(-1)[0];
      } else {
        this.page = 0
        this.paragraph_id = params[1]
        this.file = ''
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
        var path = location.href.split('/')
        path.pop()
        path.push('' + this.page)
        history.pushState(null, null, path.join('/'))
      }
      this.pdf_image = this.loading_image;
      
      if (!this.paragraph_id && !this.file) {
        this.pdf_image = '';
        return;
      }

      api
        .call("quicktask", {
          query: "?" + api.querify(this.paragraph_id ? {id: this.paragraph_id} : {source: {file: this.file, page: this.page}}),
          mongocollection: this.mongocollection
        })
        .then((data) => {
          this.paragraphs = data.result
          if (!data.result.length) {
            this.paragraphs = [{
              source: {
                file: this.file,
                page: this.page
              },
              keywords: [],
              content: '',
              _id: ''
            }]
          }  
          if (this.paragraphs.length) {
            var p = this.paragraphs[0]
            if (p.source.file) {
              var image_url =
                    `/api/image${api.querystring_stringify(p.source)}`
              var image_element = new Image();
              image_element.src = image_url;
              image_element.onload = () => {
                  this.pdf_image = image_element.src
              }
            } else {
              this.pdf_image = ''
            }
          }
        });
    },
    swipe_handler(direction) {
      if (document.getSelection().toString() || this.compact) return;
      switch (direction) {
        case "right":
          this.page = +this.page - 1;
          break;

        case "left":
          this.page = +this.page + 1;
          break;
      }
    },
    try_page(e) {
      e = e | 0;
      this.page = e;
    },
    fav(r) { api.fav(r); },
    favored(r) { return api.favored(r) },
    save_pagenum() {
      api.call(`edit/${this.mongocollection}/${this.paragraphs[0]._id}/pagenum`, this.pagenum_editor);
      this.pagenum_edit = false;
    }
  },
};
</script>

<style scoped>
.fav-button {
  opacity: 0;
}
p:hover .fav-button, .fav-button.orange--text {
  opacity: 1;
}
.paragraphs {
  line-height: 200%;
}
</style>