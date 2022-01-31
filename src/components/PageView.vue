<template>
  <v-card flat v-touch="{left: () => swipe_handler('left'), right: () => swipe_handler('right')}">
    <v-card-text>
      <v-row>
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
          页码: {{ paragraphs[0].pagenum }}<br />
          大纲: {{ paragraphs[0].outline }}<br />
          来源: <a :href="paragraphs[0].source.url" v-if="paragraphs[0].source.url">{{ paragraphs[0].source.url }}</a>
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
  </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";

export default {
  name: "PageView",
  data() {
    return {
      file: '',
      paragraph_id: '',
      page: 0,
      paragraphs: [],
      show_modal: false,
      pdf_image: "",
      dataset: "",
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
      this.dataset = params[0] === 'paragraph' ? '' : params[0]
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
          query: "?" + api.querify(this.file ? {source: {file: this.file, page: this.page}} : {id: this.paragraph_id}),
          mongocollection: this.dataset
        })
        .then((data) => {
          this.paragraphs = data.result
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