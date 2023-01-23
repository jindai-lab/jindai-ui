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
    <div
      style="width: 100%; text-align: center"
      @click="toggle_fits"
      @mousedown="change_offsets_start"
      @mousemove="change_offsets_between"
      @mouseup="change_offsets_end"
      @mousewheel="change_scale"
      draggable="true"
      v-else
    >
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
          @drag="$event.preventDefault()"
          draggable="true"
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
                v-for="(filter, page_name) in plugin_pages.filter(
                  (x) => x.format
                )"
                :key="page_name"
                icon
                dense
                :href="
                  '/' +
                  querystring_stringify({
                    q:
                      scope(paragraph) +
                      `;plugin('${format(filter.format, {
                        mediaitem: item,
                        paragraph: paragraph,
                      })}');`,
                  })
                "
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
            </div>
          </v-row>
          <GalleryContentView
            class="browsing-content"
            :paragraph="paragraph"
            view_mode="gallery-description"
          />
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import VideoPlayer from "./VideoPlayer.vue";
import GalleryContentView from "./GalleryContentView.vue"
import api from "../api";
import business from "../business/"

export default {
  name: "ImageBrowsing",
  components: {
    GalleryContentView,
    VideoPlayer,
  },
  props: ["paragraph", "item"],
  data() {
    return {
      browsing_page: 2,
      scale: 1,
      offset_x: 0,
      offset_y: 0,
      mouse_drag: {
        x: 0,
        y: 0,
        offset_x: 0,
        offset_y: 0,
        active: false,
      },
      plugin_pages : business.plugin_pages
    };
  },
  watch: {
    item(val) {
      if (!val || !val.source) this.$emit("browse", "continue");
    },
  },
  computed: {
    browsing_video() {
      return this.item && this.item.item_type == "video";
    },
  },
  methods: {
    quote(x) {
      return api.quote(x);
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
    get_item_image(item) {
      return api.get_item_image(item);
    },
    get_item_video(item) {
      return api.get_item_video(item);
    },
    fit_image(e) {
      const img = e.img || e.target,
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
            mode = imgr <= scrr ? "fit-height" : "fit-width";
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
      offsetX += this.offset_x;
      offsetY += this.offset_y;
      nh *= this.scale;
      nw *= this.scale;
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
      if (this.mouse_drag.active == null) {
        this.mouse_drag.active = false
        return
      }
      if (this.offset_x || this.offset_y || this.scale != 1) {
        this.offset_x = 0;
        this.offset_y = 0;
        this.scale = 1;
      } else {
        const fits = ["both", "visible", "maximize"];
        api.config.fit = fits[(fits.indexOf(api.config.fit) + 1) % fits.length];
      }
      this.fit_image({ target: this.$refs.browsing_image });
      this.$forceUpdate();
    },
    change_offsets_start(e) {
      if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        this.mouse_drag.x = e.pageX;
        this.mouse_drag.y = e.pageY;
        this.mouse_drag.offset_x = this.offset_x;
        this.mouse_drag.offset_y = this.offset_y;
        this.mouse_drag.active = true;
      }
    },
    change_offsets_between(e) {
      if (!this.mouse_drag.active) return;
      e.preventDefault();
      e.stopPropagation();
      var delta = {
        x: e.pageX - this.mouse_drag.x + this.mouse_drag.offset_x,
        y: e.pageY - this.mouse_drag.y + this.mouse_drag.offset_y,
      };
      this.offset_x = delta.x;
      this.offset_y = delta.y;
      e.img = this.$refs.browsing_image;
      this.fit_image(e);
    },
    change_offsets_end(e) {
      if (this.mouse_drag.active) {
        this.mouse_drag.active = null
        e.preventDefault()
        e.stopPropagation()
      }
    },
    change_scale(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        var delta = 0;
        if (e.deltaY > 0) {
          // down
          delta = 0.2;
        } else {
          delta = -0.2;
        }
        this.scale += delta;
        this.offset_x -= e.clientX - window.innerWidth / 2;
        this.offset_y -= e.clientY - window.innerHeight / 2;
        if (this.scale < 0.2) {
          this.scale = 1;
          this.offset_x = 0;
          this.offset_y = 0;
        }
        e.img = this.$refs.browsing_image;
        this.fit_image(e);
      }
    },
    browse_next() {
      this.$emit("browse", "arrowright");
      this.browsing_page = 2;
    },
    browse_prev() {
      this.$emit("browse", "arrowleft");
      this.browsing_page = 2;
    },
    querystring_stringify: api.querystring_stringify,
    scope: api.scope,
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

.browsing-content {
  max-height: 30vh;
  overflow-y: hidden;
}
</style>