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

<script>
export default {
  name: "ImagePlayer",
  components: {},
  props: ["src", "fit"],
  data() {
    return {
      mouse: { x: 0, y: 0, enabled: false },
      transform: { x: 0, y: 0, scale: 1, rotate: 0 },
    };
  },
  mounted() {
    this.$dom = this.$refs.viewerDom;
    this.$box = this.$refs.viewerBox;
    this.$img = this.$refs.nativeImage;

    for (var act of ["move", "up", "down"])
      document.addEventListener("mouse" + act, this["viewer_mouse" + act]);
    window.addEventListener("resize", this.update);
  },
  beforeDestroy() {
    for (var act of ["move", "up", "down"])
      document.removeEventListener("mouse" + act, this["viewer_mouse" + act]);
    window.removeEventListener("resize", this.update);
  },
  methods: {
    apply_transform(transf) {
      const { x, y, scale, degree } = transf;
      var width = this.$img.naturalWidth * scale,
        height = this.$img.naturalHeight * scale;
      if (degree) {
        var t = height;
        height = width;
        width = t;
      }
      (this.$dom.style.width = width + "px"),
        (this.$dom.style.height = height + "px"),
        (this.$dom.style["margin-left"] = x + "px");
      this.$dom.style["margin-top"] = y + "px";
      this.$img.style["transform-origin"] = "top left";
      var trs = [
        degree ? `translate(${width}px, 0) rotate(90deg)` : "",
        `scale(${scale})`,
      ].join(" ");
      this.$img.style.transform = trs;
      this.transform = transf;
    },

    viewer_mouseup() {
      this.mouse.enabled = false;
    },

    viewer_mousemove(e) {
      if (!this.mouse.enabled) return;
      let { degree, scale } = this.transform;
      let x = e.clientX - this.mouse.x;
      let y = e.clientY - this.mouse.y;
      this.apply_transform({ x, y, scale, degree });
    },

    viewer_mousedown(e) {
      let { x, y } = this.transform;
      this.mouse.enabled = true;
      this.mouse.x = e.clientX - x;
      this.mouse.y = e.clientY - y;
    },

    viewer_mousewheel(e) {
      if (!e.ctrlKey) return;
      let { x, y, scale, degree } = this.transform;
      let oldScale = scale;
      if (e.deltaY < 0) {
        scale *= 1.05;
      } else {
        scale /= 1.05;
      }
      var dx = (this.$img.naturalWidth * (oldScale - scale)) / 2;
      var dy = (this.$img.naturalHeight * (oldScale - scale)) / 2;
      x += dx;
      y += dy;
      this.apply_transform({ x, y, scale, degree });
    },

    update() {
      const native = this.$img;
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
            Math.max(window.innerWidth, window.innerHeight) /
            Math.max(width, height);
          if (window.innerHeight > window.innerWidth != height > width)
            degree = 90;
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