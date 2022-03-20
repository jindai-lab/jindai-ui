<template>
  <v-card
    v-touch="{
      left: () => browse_next(),
      right: () => browse_prev(),
      down: () => $emit('close'),
      up: () => $emit('rating', {item: active_item, inc: 1}),
    }"
    @wheel.prevent="_wheel_handler"
    v-if="paragraph_images.length"
  >
    <video-player
      :src="get_item_video(active_item)"
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
      v-if="browsing_video"
    />
    <div style="width: 100%; text-align: center" @click="toggle_fits" v-else>
      <div
        :style="{
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
        }"
      >
        <img
          v-if="active_item"
          :src="get_item_image(active_item)"
          alt="Browsing Image"
          ref="browsing_image"
          @load="fit_image"
        />
      </div>
    </div>
    <v-card-text class="browsing description">
      <v-row align="end">
        <v-col cols="2">
          <v-pagination
            v-model="browsing_page"
            :length="3"
            :total-visible="0"
            @previous="browse_prev"
            @next="browse_next"
          ></v-pagination>
        </v-col>
        <v-col cols="10" class="item-description" v-if="active_item">
          <v-row>
            <v-col cols="8" sm="6" class="no-padding-margin">
              <v-rating
                style="display: inline-block"
                v-model="active_item.rating"
                background-color="white"
                color="yellow accent-4"
                half-increments
                hover
                size="18"
                @input="$emit('rating', { item: active_item, val: $event })"
              ></v-rating>
              <span class="grey--text text--lighten-2">
                ({{ active_item.rating.toFixed(1) }})
              </span>
            </v-col>
            <v-col cols="2" sm="3" class="no-padding-margin">
              <v-btn
                v-for="(page, page_name) in plugin_pages"
                :key="page_name"
                icon
                dense
                :href="`?q=author%3D${quote(paragraph.author)};page('${format(
                  page.format,
                  {
                    imageitem: active_item,
                    paragraph: paragraph,
                  }
                )}')&archive=true`"
                class="t_func sim"
                target="_blank"
                ><v-icon>{{ page.icon }}</v-icon></v-btn
              >
              <v-btn icon dense @click="$emit('info', active_item)" target="_blank"
                ><v-icon>mdi-information</v-icon></v-btn
              >
            </v-col>
            <v-spacer></v-spacer>
          </v-row>
          <ContentView :paragraph="paragraph" view_mode="gallery-description" />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import ContentView from "./ContentView.vue";
import VideoPlayer from "./VideoPlayer.vue";
import api from "../api";

export default {
  name: "ImageBrowsing",
  components: {
    ContentView,
    VideoPlayer,
  },
  props: [
    "paragraph", "visible"
  ],
  watch: {
    item_index() {
      this._emit_browse()
    },
    paragraph() {
      this.item_index =
        this.start_item >= 0
          ? this.start_item
          : this.paragraph_images.length - 1;
      if (this.item_index < 0 || this.item_index >= this.paragraph_images.length)
        this.$emit(this.start_item >= 0 ? 'next' : 'prev')
      this._emit_browse()
    },
    'paragraph.images': function (val) {
      if (!val || val.length <= this.item_index) {
        this.item_index = val.length - 1
        if (this.item_index < 0) {
          this.$emit("next");
          this.start_item = 0;
        }
      }
      this._emit_browse()
    }
  },
  data() {
    return {
      item_index: 0,
      start_item: 0,
      fit: "both",
      playing_timer: 0,
      playing_interval: 2000,
      plugin_pages: [],
      browsing_page: 1,
    };
  },
  mounted() {
    var config = api.load_config("browse", {
      fit: "both",
      playing_interval: 2000,
    });
    this.fit = config.fit;
    this.playing_interval = config.playing_interval;
    api.call("plugins/pages").then((data) => (this.plugin_pages = data.result));
    this._emit_browse()
  },
  computed: {
    active_item() {
      return this.paragraph_images[this.item_index];
    },
    paragraph_images() {
      return this.paragraph.images || [];
    },
    browsing_video() {
      return (
        this.active_item &&
        this.active_item.source &&
        (this.active_item.source.url || this.active_item.source.file || "")
          .split(".")
          .pop() == "mp4"
      );
    },
  },
  created() {
    window.addEventListener('keyup', this._keyup_handler)
  },
  beforeDestroy() {
    window.removeEventListener('keyup', this._keyup_handler)
  },
  methods: {
    _emit_browse(){
      this.$emit(
        "browse",
        Object.assign({}, this.paragraph, { images: [this.active_item] })
      );
    },
    quote(x) {
      return encodeURIComponent(api.quote(x));
    },
    format(str, bundle) {
      function _replace(_, i) {
        var b = bundle;
        for (var k of i.split(".")) b = b[k] || "";
        return b;
      }
      return str.replace(/\{([\w\d._]+)\}/g, _replace);
    },
    get_item_image(item) {
      return api.get_item_image(item, this.config);
    },
    get_item_video: api.get_item_video,

    fit_image(e) {
      const img = e.target,
        wh = window.innerHeight,
        ww = window.innerWidth,
        imgr = img.naturalWidth / img.naturalHeight;
      const scrr = ww / wh;
      var nh = 0,
        nw = 0,
        transform = "",
        mode = "",
        offsetX = 0,
        offsetY = 0,
        rr = imgr < 1 != scrr < 1;

      if (this.fit == "both" && rr) {
        mode = 1 / imgr >= scrr ? "fit-height" : "fit-width";
        switch (mode) {
          case "fit-width":
            nh = ww;
            nw = nh * imgr;
            offsetX = nh;
            offsetY = (wh - nw) / 2;
            break;
          case "fit-height":
            nw = wh;
            nh = nw / imgr;
            offsetX = (nh + ww) / 2;
            offsetY = 0;
            break;
        }
        transform = "rotate(90deg)";
      } else {
        switch (this.fit) {
          case "both":
          case "maximize":
            mode = imgr >= scrr ? "fit-height" : "fit-width";
            break;
          default:
            mode = scrr > 1 ? "fit-height" : "fit-width";
        }
        switch (mode) {
          case "fit-width":
            nw = ww;
            nh = ww / imgr;
            break;
          case "fit-height":
            nh = wh;
            nw = nh * imgr;
            break;
        }
        transform = `translate(${(ww - nw) / 2}px, ${(wh - nh) / 2}px)`;
      }
      Object.assign(img.style, {
        height: nh + "px",
        width: nw + "px",
        transform: transform,
        "transform-origin": "left top",
        top: offsetY + "px",
        left: offsetX + "px",
        position: "absolute",
        display: "block",
      });
    },
    toggle_fits() {
      const fits = ["both", "visible", "maximize"];
      this.fit = fits[(fits.indexOf(this.fit) + 1) % fits.length];
      this.fit_image({ target: this.$refs.browsing_image });
      api.save_config("browse", { fit: this.fit });
      this.$forceUpdate();
    },
    browse_next() {
      if (this.item_index == this.paragraph_images.length - 1) {
        this.$emit("next");
        this.start_item = 0;
      } else {
        this.item_index++;
      }
    },
    browse_prev() {
      if (this.item_index == 0) {
        this.$emit("prev");
        this.start_item = -1;
      } else {
        this.item_index--;
      }
    },
    playing() {
      this.playing_timer = setInterval(() => {
        this.browse_next();
      }, this.playing_interval);
    },
    _wheel_handler(e) {
      if (e.deltaY > 0) {
        this.browse_next();
      } else {
        this.browse_prev();
      }
    },
    _keyup_handler(e) {
      if (!this.visible) return;
      if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;
      switch (e.key) {
        case "ArrowLeft":
          if (this.playing_timer) clearInterval(this.playing_timer);
          this.browse_prev();
          e.preventDefault()
          break;
        case "ArrowRight":
          if (this.playing_timer) clearInterval(this.playing_timer);
          this.browse_next();
          e.preventDefault()
          break;
        case "g":
          document.querySelector(".browsing.description a.t_group").click();
          e.preventDefault()
          break;
        case "Enter":
          this.playing();
          e.preventDefault()
          break;
      }
    },
  },
};
</script>

<style scoped>
.v-card {
  overflow: hidden;
  height: 100vh;
  width: 100%;
}
.description {
  position: fixed;
  bottom: 0;
  backdrop-filter: blur(5px);
  background-color: rgba(255, 255, 255, 0.5);
  opacity: 0;
}
.theme--dark .description {
  background-color: rgba(0, 0, 0, 0.5);
}
.description:hover {
  opacity: 1;
  z-index: 101;
}
</style>

<style>
.description .v-card {
  border: hidden;
  background: none;
  box-shadow: none !important;
}
</style>