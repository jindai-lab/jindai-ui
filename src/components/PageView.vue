<template>
  <div>
    <div class="mui-row">
      <h3 class="mui-col-md-10">{{ pdffile }}</h3>
      <div class="mui-col-md-1 mui-textfield">
        <input
          type="text"
          :value="pdfpage"
          @keyup.enter="$router.push('./' + parseInt($event.target.value))"
        />
      </div>
    </div>
    <div class="mui-row">
      <div class="paragraphs mui-col-md-6 mui-panel">
        <p v-for="p in paragraphs" :key="p._id">
          {{ p.content }}
        </p>
      </div>
      <div class="image mui-col-md-6">
        <img
          :src="pdf_image(pdffile, pdfpage)"
          alt=""
          @click="show_modal = true"
          style="width: 100%"
        />
      </div>
    </div>
    <Modal v-if="show_modal" @close="show_modal = false">
      <h3 slot="header"></h3>
      <div slot="body">
        <img :src="pdf_image(pdffile, pdfpage)" alt="" style="width: 100%" />
      </div>
    </Modal>
  </div>
</template>

<script>
import api from "../api";
import Modal from "./ModalView";

export default {
  name: "PageView",
  props: ["pdffile", "pdfpage"],
  components: {
    Modal,
  },
  data() {
    return {
      paragraphs: [],
      show_modal: false,
    };
  },
  created() {
    const component = this;
    this.handler = function (e) {
      component.$emit("keyup", e);
      if (e.target.tagName == 'INPUT') return
      switch (e.key) {
        case "ArrowRight":
          component.$router.push("./" + (+component.pdfpage + 1));
          break;
        case "ArrowLeft":
          if (+component.pdfpage > 0)
            component.$router.push("./" + (+component.pdfpage - 1));
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
  },
  watch: {
    pdfpage() {
      this.update_pdfpage();
    },
  },
  methods: {
    pdf_image(pdffile, pdfpage) {
      return api.pdf_image(pdffile, pdfpage);
    },
    update_pdfpage() {
      api
        .call("quicktask", {
          q: "pdffile=`" + this.pdffile + "`,pdfpage=" + this.pdfpage,
        })
        .then((resp) => (this.paragraphs = resp.data.result));
    },
  },
};
</script>
