<template>
  <div class="video">
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
      @pause="playing=false"
      @dblclick="requestFullscreen"
      :key="src"
    >
      <source :src="src" />
    </video>
    <div class="controls" v-if="!options.controls">
      <v-btn icon @click="toggle_play"><v-icon v-show="!playing">mdi-play</v-icon><v-icon v-show="playing">mdi-pause</v-icon></v-btn>
      <select class="rates" @change="playbackRate = vp.playbackRate = +$event.target.value" :value="vp.playbackRate">
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
        dark dense
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
  name: 'VideoPlayer',
  props: ["src", "options"],
  data () {
    return {
      playing: false,
      vp: {},
      currentTime: 0,
      playbackRate: 1,
    }
  },
  methods: {
    handleVideoPlay(e) {
      this.$emit('play', e);
    },
    handleVideoPlaying(e) {
      this.playing = true;
      this.vp = e.target;
      this.vp.playbackRate = this.playbackRate;
    },
    requestFullscreen(e) {
      e.target.requestFullscreen()
    },
    toggle_play() {
      if (this.playing) this.vp.pause(); else this.vp.play();
    },
    to_friendly_time(secs) {
      function _lz(x) {
        return x < 10 ? '0' + x : '' + x
      }
      secs = secs | 0;
      const mins = ((secs / 60) % 60) | 0;
      const hours = (secs / 3600) | 0;
      secs = secs % 60;
      if (hours > 0)
        return `${hours}:${_lz(mins)}:${_lz(secs)}`
      else
        return `${_lz(mins)}:${_lz(secs)}`
    },
    fullscreen() {
      this.vp.requestFullscreen()
    }
  },
  mounted () {
    const vm = this;
    setInterval(() => {
      if (vm.playing && vm.vp.currentTime) {
        const span = vm.$refs.duration, slider = vm.$refs.slider;
        if (span) {
          span.innerText = `${vm.to_friendly_time(vm.vp.currentTime)}/${vm.to_friendly_time(vm.vp.duration)}`;
          slider.$el.style.width = (window.innerWidth - span.offsetLeft - span.offsetWidth - 70) + 'px';
        }
        vm.currentTime = vm.vp.currentTime;
      }
    }, 1000)
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
