<template>
  <div v-touch:swipe="swipe_handler">
    <div class="mui-row">
      <h3 class="mui-col-md-8">
        <!-- <a href="javascript:void(0)"><font-awesome-icon icon="arrow-left" @click="$router.back()" /></a> -->
        {{ pdffile }}
      </h3>
      <div class="mui-col-md-4 mui-row">
      <button
        class="mui-btn mui-col-md-2"
        @click="swipe_handler('right')"
        :enabled="pdfpage > 0"
      >
        <font-awesome-icon icon="caret-left" />
      </button>
      <div class="mui-textfield mui-col-md-8">
        <input
          type="text"
          :value="pdfpage"
          @keyup.enter="pdfpage = parseInt($event.target.value)"
        />
      </div>
      <button class="mui-btn mui-col-md-2" @click="swipe_handler('left')">
        <font-awesome-icon icon="caret-right" />
      </button>
      </div>
    </div>

    <div class="mui-row">
      <div class="paragraphs mui-col-md-6 mui-panel">
        <p v-for="p in paragraphs" :key="p._id">
          {{ p.content }}
        </p>
      </div>
      <div class="image mui-col-md-6" @click="show_modal = true">
        <img :src="pdf_image" alt="" style="width: 100%" />
      </div>
    </div>
    <Modal v-if="show_modal" @close="show_modal = false">
      <h3 slot="header"></h3>
      <div slot="body">
        <img :src="pdf_image" alt="" style="width: 100%" />
      </div>
    </Modal>
  </div>
</template>

<script>
import api from "../api";
import Modal from "./ModalView";

export default {
  name: "PageView",
  components: {
    Modal,
  },
  data() {
    return {
      pdffile: "",
      pdfpage: 0,
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
          this.pdfpage = +this.pdfpage + 1;
          break;
        case "ArrowLeft":
          if (+this.pdfpage > 0) this.pdfpage = +this.pdfpage - 1;
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
    this.pdffile = decodeURIComponent(params.slice(1, -1).join("/"));
    this.pdfpage = +params.slice(-1)[0];
    this.update_pdfpage();
  },
  watch: {
    pdfpage() {
      this.update_pdfpage();
    },
  },
  methods: {
    update_pdfpage() {
      this.pdf_image = this.loading_image;
      if (!this.pdffile) return;
      api
        .call("quicktask", {
          query: "?pdffile=`" + this.pdffile + "`,pdfpage=" + this.pdfpage,
          mongocollection: this.dataset
        })
        .then((data) => (this.paragraphs = data.result));
      api
        .blob(
          "pdfimage?pdffile=" +
            encodeURIComponent(this.pdffile) +
            "&pdfpage=" +
            this.pdfpage
        )
        .then((u) => (this.pdf_image = u));
    },
    swipe_handler(direction) {
      switch (direction) {
        case "right":
          this.pdfpage = +this.pdfpage - 1;
          break;

        case "left":
          this.pdfpage = +this.pdfpage + 1;
          break;
      }
    },
  },
};
</script>
