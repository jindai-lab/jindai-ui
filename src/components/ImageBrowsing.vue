<template>
  <div class="browser" v-if="item">
    <video-player
      :src="api.get_item_video(item)"
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
    <div style="width: 100%; text-align: center" draggable="true" v-else>
      <div
        :style="{
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
        }"
        id="viewer-parent"
      >
        <viewer :images="[]"  @inited="viewer_inited" :options="{viewed: viewer_inited }" class="viewer">
          <div class="map-img">
            <div class="map-list">
              <img :src="this.api.get_item_image(item)" ref="nativeImage" />
            </div>
          </div>
        </viewer>
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
                @input="$emit('rating', { val: $event })"
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
                  api.querystring_stringify({
                    q:
                      api.scope(paragraph) +
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
import GalleryContentView from "./GalleryContentView.vue";

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
      plugin_pages: this.business.plugin_pages,
    };
  },
  watch: {
    item(val) {
      if (!val || !val.source) this.$emit("browse", "continue");
    }
  },
  computed: {
    browsing_video() {
      return this.item && this.item.item_type == "video";
    },
    fit() {
      return this.api.config.fit;
    },
  },
  methods: {
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
    browse_next() {
      this.$emit("browse", "arrowright");
      this.browsing_page = 2;
    },
    browse_prev() {
      this.$emit("browse", "arrowleft");
      this.browsing_page = 2;
    },
    viewer_inited(viewer) {
      viewer = viewer || this.$viewer
      if (viewer && viewer.target && viewer.target.viewer)
        viewer = viewer.target.viewer
      if (!viewer || !viewer.zoomTo) return
      this.$viewer = viewer
      viewer.reset()
      var scale = 1,
        degree = 0;
      const width = this.$refs.nativeImage.naturalWidth,
        height = this.$refs.nativeImage.naturalHeight;
        if (!width || !height) return
      switch (this.api.config.fit) {
        case "width":
          scale = window.innerWidth / width;
          break;
        case "height":
          scale = window.innerHeight / height;
          break;
        default:
          scale =
            Math.max(window.innerWidth, window.innerHeight) /
            Math.max(width, height);
          if (window.innerHeight > window.innerWidth != (height > width))
            degree = 90;
          break;
      }
      viewer.zoomTo(scale)
      viewer.rotate(degree)
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
.map-img {
  opacity: 0;
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

.viewer-toolbar {
  width: 20px;
  position: fixed;
  left: 20px;
  top: calc((100vh - 250px) / 2);
  z-index: 2;
}

.viewer-toolbar .viewer-play,
.viewer-toolbar .viewer-next,
.viewer-toolbar .viewer-prev {
  display: none;
}
</style>