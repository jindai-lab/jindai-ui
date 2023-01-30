<template>
  <div
    class="viewer-parent"
    ref="viewerBox"
    @mousewheel="viewer_mousewheel"
    @selectstart="$event.preventDefault()"
  >
    <div class="viewer" ref="viewerDom">
      <img :src="src" ref="nativeImage" draggable="false" @load="update" />
    </div>
  </div>
</template>

<script lang="ts">
type TransformInfo = {
  degree: number;
  x: number;
  y: number;
  scale: number;
};

var dom: HTMLElement, img: HTMLImageElement, box: HTMLElement;

export default {
  name: "ImagePlayer",
  components: {},
  props: ["src", "fit"],
  data() {
    return {
      mouse: { x: 0, y: 0, enabled: false },
      transform: { x: 0, y: 0, scale: 1, degree: 0 },
    };
  },
  mounted() {
    dom = this.$refs.viewerDom as HTMLElement;
    img = this.$refs.nativeImage as HTMLImageElement;
    box = dom.parentElement as HTMLElement;

    box.addEventListener("mousemove", this.viewer_mousemove);
    box.addEventListener("mouseup", this.viewer_mouseup);
    box.addEventListener("mousedown", this.viewer_mousedown);
    window.addEventListener("resize", this.update);
  },
  beforeDestroy() {
    box.removeEventListener("mousemove", this.viewer_mousemove);
    box.removeEventListener("mouseup", this.viewer_mouseup);
    box.removeEventListener("mousedown", this.viewer_mousedown);
    window.removeEventListener("resize", this.update);
  },
  methods: {
    apply_transform(transf: TransformInfo) {
      const { x, y, scale, degree } = transf;
      var width = img.naturalWidth * scale,
        height = img.naturalHeight * scale;
      if (degree) {
        var t = height;
        height = width;
        width = t;
      }
      dom.style.width = width + "px";
      dom.style.height = height + "px";
      dom.style.marginLeft = x + "px";
      dom.style.marginTop = y + "px";
      img.style.transformOrigin = "top left";
      var trs = [
        degree ? `translate(${width}px, 0) rotate(90deg)` : "",
        `scale(${scale})`,
      ].join(" ");
      img.style.transform = trs;
      this.transform = transf;
    },

    viewer_mouseup() {
      this.mouse.enabled = false;
    },

    viewer_mousemove(e: MouseEvent) {
      if (!this.mouse.enabled) return;
      let { degree, scale } = this.transform;
      let x = e.clientX - this.mouse.x;
      let y = e.clientY - this.mouse.y;
      this.apply_transform({ x, y, scale, degree });
    },

    viewer_mousedown(e: MouseEvent) {
      let { x, y } = this.transform;
      this.mouse.enabled = true;
      this.mouse.x = e.clientX - x;
      this.mouse.y = e.clientY - y;
    },

    viewer_mousewheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      let { x, y, scale, degree } = this.transform;
      let oldScale = scale;
      if (e.deltaY < 0) {
        scale *= 1.05;
      } else {
        scale /= 1.05;
      }
      var dx = (img.naturalWidth * (oldScale - scale)) / 2;
      var dy = (img.naturalHeight * (oldScale - scale)) / 2;
      x += dx;
      y += dy;
      this.apply_transform({ x, y, scale, degree });
    },

    update() {
      const native = img;
      var scale = 1,
        degree = 0,
        x = 0,
        y = 0;
      const width = native.naturalWidth,
        height = native.naturalHeight;
      if (!width || !height) return;
      switch (this.fit) {
        case "width":
          scale = window.innerWidth / width;
          break;
        case "height":
          scale = window.innerHeight / height;
          break;
        default:
          scale =
            Math.max(window.innerWidth, window.innerHeight) / Math.max(width, height);
          if (window.innerHeight > window.innerWidth != height > width) degree = 90;
          break;
      }
      var nh = height * scale,
        nw = width * scale;
      if (degree) {
        var t = nh;
        nh = nw;
        nw = t;
      }
      x = (window.innerWidth - nw) / 2;
      y = (window.innerHeight - nh) / 2;
      this.apply_transform({ x, y, scale, degree });
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

.map-img {
  opacity: 0;
}

.viewer-parent {
  position: absolute;
  left: 0;
  right: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
