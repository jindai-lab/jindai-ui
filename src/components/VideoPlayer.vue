<template>
  <div class="video"
  >
    <!-- video player -->
    <video
      class="video__player"
      ref="videoPlayer"
      preload="auto"
      :controls="options.controls"
      :autoplay="options.autoplay"
      :muted="options.muted"
      webkit-playsinline="true"
      playsinline="true"
      x-webkit-airplay="allow"
      x5-video-player-type="h5-page"
      x5-video-orientation="portraint"
      :style="options.style || {}"
      @play="handleVideoPlay"
      @playing="handleVideoPlaying"
      @pause="playing = false"
      @dblclick="requestFullscreen"
      :key="src"
      @mousedown="handleMouse"
    >
      <source :src="src" />
    </video>
    <div class="controls" v-if="!options.controls">
      <v-btn icon @click="toggle_play"
        ><v-icon v-show="!playing">mdi-play</v-icon
        ><v-icon v-show="playing">mdi-pause</v-icon></v-btn
      >
      <select
        class="rates"
        @change="playbackRate = vp.playbackRate = +$event.target.value"
        :value="vp.playbackRate"
      >
        <option :value="0.5">0.5x</option>
        <option :value="1">1.0x</option>
        <option :value="2">2.0x</option>
        <option :value="4">4.0x</option>
        <option :value="8">8.0x</option>
      </select>
      <span ref="duration"></span>
      <v-slider
        :max="vp.duration"
        :min="0"
        :value="currentTime"
        ref="slider"
        hide-details
        dark
        dense
        class="d-inline-block"
        @change="vp.currentTime = $event"
        color="white"
      ></v-slider>
      <v-btn icon @click="fullscreen"><v-icon>mdi-fullscreen</v-icon></v-btn>
    </div>
  </div>
</template>

<script>
export default {
  name: "VideoPlayer",
  props: ["src", "options"],
  data() {
    return {
      playing: false,
      vp: {},
      currentTime: 0,
      playbackRate: 1,
    };
  },
  methods: {
    handleVideoPlay(e) {
      this.$emit("play", e);
    },
    handleVideoPlaying(e) {
      this.playing = true;
      this.vp = e.target;
      this.vp.playbackRate = this.playbackRate;
    },
    handleMouse(e) {
      var delta = null;
      if (e.type && e.type == 'mousedown') {
        e.cancelBubble = true;
        if (e.clientX < window.innerWidth / 3) delta = -15;
        else if (e.clientX > (window.innerWidth * 2) / 3) delta = 15;
        else delta = 0
      }
      if (delta == null) return
      if (delta == 0) this.toggle_play();
      else {
        this.vp.currentTime += delta
      }
    },
    requestFullscreen(e) {
      e.target.requestFullscreen();
    },
    toggle_play() {
      if (this.playing) this.vp.pause();
      else this.vp.play();
    },
    to_friendly_time(secs) {
      function _lz(x) {
        return x < 10 ? "0" + x : "" + x;
      }
      secs = secs | 0;
      const mins = (secs / 60) % 60 | 0;
      const hours = (secs / 3600) | 0;
      secs = secs % 60;
      if (hours > 0) return `${hours}:${_lz(mins)}:${_lz(secs)}`;
      else return `${_lz(mins)}:${_lz(secs)}`;
    },
    fullscreen() {
      this.vp.requestFullscreen();
    },
    handleKey(e) {
      if (!this.playing) return
      switch(e.key) {
        case ",":
          this.vp.currentTime -= 15
          break
        case ".":
          this.vp.currentTime += 15
          break
        case "/":
          this.vp.currentTime = this.vp.duration / 2
          break
      }
    },
  },
  mounted() {
    const vm = this;
    setInterval(() => {
      const span = vm.$refs.duration,
          slider = vm.$refs.slider;
      if (vm.playing && vm.vp.currentTime && document.activeElement != slider) {  
        if (span) {
          span.innerText = `${vm.to_friendly_time(
            vm.vp.currentTime
          )}/${vm.to_friendly_time(vm.vp.duration)}`;
          slider.$el.style.width =
            window.innerWidth - span.offsetLeft - span.offsetWidth - 70 + "px";
        }
        vm.currentTime = vm.vp.currentTime;
      }
    }, 500);
  },
  created() {
    window.addEventListener('keydown', this.handleKey)
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKey)
  }
};
</script>

<style scoped>
.controls {
  z-index: 101;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}

select.rates {
  color: white;
  margin: 5px;
}

select.rates option {
  background: black;
}

.v-input__slider {
  margin-top: 2px;
  margin-bottom: 2px;
  vertical-align: middle;
}
</style>
