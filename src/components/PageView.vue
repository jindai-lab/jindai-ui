<template>
  <div>
    <div class="mui-row">
      <h3 class="mui-col-md-10">
        <!-- <a href="javascript:void(0)"><i class="fa fa-arrow-left" @click="$router.back()"></i></a> -->
        {{ pdffile }}</h3>
      <div class="mui-col-md-1 mui-textfield">
        <input
          type="text"
          :value="pdfpage"
          @keyup.enter="pdfpage = parseInt($event.target.value)"
        />
      </div>
    </div>
    <div class="mui-row">
      <div class="paragraphs mui-col-md-6 mui-panel">
        <p v-for="p in paragraphs" :key="p._id">
          {{ p.content }}
        </p>
      </div>
      <div class="image mui-col-md-6" 
          @click="show_modal = true"
      >
        <img
          :src="pdf_image"
          alt=""
          style="width: 100%"
        />
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
      pdffile: '',
      pdfpage: 0,
      paragraphs: [],
      show_modal: false,
      pdf_image: '',
      loading_image: require('../../public/assets/loading.png')
    };
  },
  created() {
    this.handler = e => {
      this.$emit("keyup", e);
      if (e.target.tagName == 'INPUT') return
      switch (e.key) {
        case "ArrowRight":
          this.pdfpage = (+this.pdfpage + 1);
          break;
        case "ArrowLeft":
          if (+this.pdfpage > 0)
            this.pdfpage = (+this.pdfpage - 1);
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
    this.update_pdfpage();
    this.$root.$on('view', (pdffile, pdfpage) => {
      this.pdffile = pdffile
      this.pdfpage = pdfpage
    })
  },
  watch: {
    pdfpage() {
      this.update_pdfpage();
    },
  },
  methods: {
    update_pdfpage() {
      this.pdf_image = this.loading_image
      if (!this.pdffile) return
      api
        .call("quicktask", {
          q: "pdffile=`" + this.pdffile + "`,pdfpage=" + this.pdfpage,
        })
        .then((data) => (this.paragraphs = data.result));
      api.pdf_image(this.pdffile, this.pdfpage, this);
    },
  },
};
</script>
