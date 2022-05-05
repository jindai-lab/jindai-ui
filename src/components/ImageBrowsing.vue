<template>
  <div class="browser" v-if="item">
    <video-player
      :src="get_item_video(item)"
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
          v-if="item"
          :src="get_item_image(item)"
          alt="Browsing Image"
          ref="browsing_image"
          @load="fit_image"
        />
      </div>
    </div>
    <div class="browsing description">
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
        <v-col cols="10" class="item-description" v-if="item">
          <v-row class="mt-3 mb-3">
            <div class="mr-3" v-if="typeof item.rating == 'number'">
              <v-rating
                style="display: inline-block"
                v-model="item.rating"
                background-color="white"
                color="yellow accent-4"
                half-increments
                hover
                size="18"
                @input="$emit('rating', { item: item, val: $event })"
              ></v-rating>
              <span class="grey--text text--lighten-2"
                >({{ item.rating.toFixed(1) }})
              </span>
            </div>
            <div>
              <v-btn
                v-for="(filter, page_name) in plugin_filters"
                :key="page_name"
                icon
                dense
                :data-keybind="filter.keybind"
                :href="`?q=author%3D${quote(paragraph.author)};plugin('${format(
                  filter.format,
                  {
                    imageitem: item,
                    paragraph: paragraph,
                  }
                )}')&archive=true`"
                class="t_func sim"
                target="_blank"
                ><v-icon>{{ filter.icon }}</v-icon></v-btn
              >
              <v-btn
                icon
                dense
                @click="$emit('info', item)"
                target="_blank"
                data-keybind="i"
                ><v-icon>mdi-information</v-icon></v-btn
              >
              <v-btn icon dense @click="google" data-keybind="m"
                ><v-icon>mdi-google</v-icon></v-btn
              >
            </div>
          </v-row>
          <ContentView :paragraph="paragraph" view_mode="gallery-description" />
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import ContentView from "../components/ContentView.vue";
import VideoPlayer from "../components/VideoPlayer.vue";
import api from "../api";

export default {
  name: "ImageBrowsing",
  components: {
    ContentView,
    VideoPlayer,
  },
  props: ["paragraph", "item"],
  data() {
    return {
      plugin_filters: [],
      browsing_page: 2,
    };
  },
  watch: {
    item(val) {
      if (!val || !val.source) this.$emit("browse", "continue");
    },
  },
  created() {
    api
      .call("plugins/filters")
      .then((data) => (this.plugin_filters = data.result));
  },
  computed: {
    browsing_video() {
      return (
        this.item &&
        this.item.source &&
        (this.item.source.url || this.item.source.file || "")
          .split(".")
          .pop() == "mp4"
      );
    },
  },
  methods: {
    quote(x) {
      return encodeURIComponent(api.quote(x));
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
    google() {
      var image = this.$refs.browsing_image;
      function getDataUri(image, callback) {
        var canvas = document.createElement("canvas");
        canvas.width = (image.naturalWidth * 300) / image.naturalHeight;
        canvas.height = 300;
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        callback(
          canvas
            .toDataURL("image/jpeg")
            .replace(/^data:image\/(png|jpeg);base64,/, "")
        );
      }

      getDataUri(image, function (dataUrl) {
        dataUrl = dataUrl.replace(/\//g, "_").replace(/\+/g, "-");
        var html =
          `<html>
          <head><title>Search by Image (by Google)</title></head>
          <body><form id="f" method="POST" action="https://www.google.com/searchbyimage/upload" enctype="multipart/form-data">
            <input type="hidden" name="image_content" value="${dataUrl}">
            <input type="hidden" name="filename" value=""><input type="hidden" name="image_url" value=""><input type="hidden" name="sbisrc" value="cr_1_5_2">
            <input type="hidden" name="width" value="${image.naturalWidth}"><input type="hidden" name="height" value="${image.naturalHeight}">
          </form><script>document.getElementById("f").submit();</scr` +
          `ipt></body></html>`;
        var win = window.open();
        win.document.write(html);
      });
    },
    get_item_image(item) {
      return api.get_item_image(item);
    },
    get_item_video(item) {
      return api.get_item_video(item);
    },
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

      if (api.config.fit == "both" && rr) {
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
        switch (api.config.fit) {
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
      api.config.fit = fits[(fits.indexOf(api.config.fit) + 1) % fits.length];
      this.fit_image({ target: this.$refs.browsing_image });
      this.$forceUpdate();
    },
    browse_next() {
      this.$emit("browse", "arrowright");
      this.browsing_page = 2;
    },
    browse_prev() {
      this.$emit("browse", "arrowleft");
      this.browsing_page = 2;
    },
  },
};
</script>

<style scoped>
.browser {
  overflow: hidden;
  height: 100vh;
  width: 100%;
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
.description:hover {
  opacity: 1;
  z-index: 101;
}
</style>

<style>
.description {
  border: hidden;
  background: none;
  box-shadow: none !important;
}
</style>