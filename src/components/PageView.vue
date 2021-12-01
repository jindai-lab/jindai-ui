<template>
  <v-card flat v-touch="{left: () => swipe_handler('left'), right: () => swipe_handler('right')}">
    <v-card-text>
      <v-row>
        <v-col class="heading">
              {{ file }}
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
          @keyup.enter="page = parseInt($event.target.value)"
        ></v-text-field>
      <v-btn icon @click="swipe_handler('left')">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
      </v-row>
    
    <v-row>
      <v-col cols="6">
        <div class="paragraphs mui-panel">
          <p v-for="p in paragraphs" :key="p._id">
            {{ p.content }}
          </p>
        </div>
        <div v-if="paragraphs.length > 0">
          日期: {{ paragraphs[0].pdate }}<br />
          页码: {{ paragraphs[0].pagenum }}<br />
          大纲: {{ paragraphs[0].outline }}<br />
          来源: {{ paragraphs[0].source.file }} {{ paragraphs[0].source.page }}<br>
        </div>
      </v-col>
      <v-col cols="6" class="image mui-col-md-6" @click="show_modal = true">
        <img :src="pdf_image" alt="" style="width: 100%" />
      </v-col>
    </v-row>
    <v-dialog v-model="show_modal" fullscreen>
      <v-btn fab icon absolute top right class="ma-10" @click="show_modal = false"><v-icon>mdi-close</v-icon></v-btn>
      <img :src="pdf_image" alt="" style="width: 100%" />
    </v-dialog>
  </v-card-text>
  </v-card>
</template>

<script>
import QueryString from 'qs';
import api from "../api";

export default {
  name: "PageView",
  data() {
    return {
      file: '',
      page: 0,
      paragraphs: [],
      show_modal: false,
      pdf_image: "",
      dataset: "",
      loading_image: require("../../public/assets/loading.png"),
    };
  },
  created() {
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
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.handler);
  },
  mounted() {
    let params = window.location.href.split("/");
    params = params.slice(params.indexOf("view") + 1);
    this.dataset = params[0] === 'default' ? '' : params[0]
    this.file = decodeURIComponent(params.slice(1, -1).join("/"));
    this.page = +params.slice(-1)[0];
    this.update_pdfpage();
  },
  watch: {
    page() {
      this.update_pdfpage();
    },
  },
  methods: {
    update_pdfpage() {
      this.pdf_image = this.loading_image;
      if (!this.file) return;
      api
        .call("quicktask", {
          query: "?" + api.querify({source: {file: this.file, page: this.page}}),
          mongocollection: this.dataset
        })
        .then((data) => (this.paragraphs = data.result));
      var image_url =
          "/api/image?" + QueryString.stringify({
            file: this.file,
            page: this.page
          })
      var image_element = new Image();
      image_element.src = image_url;
      image_element.onload = () => {
          this.pdf_image = image_element.src
      }
    },
    swipe_handler(direction) {
      if (document.getSelection().toString()) return;
      switch (direction) {
        case "right":
          this.page = +this.page - 1;
          break;

        case "left":
          this.page = +this.page + 1;
          break;
      }
    },
  },
};
</script>
