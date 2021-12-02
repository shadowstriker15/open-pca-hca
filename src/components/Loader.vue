<template>
  <div class="loader-wrapper">
    <div id="loader" class="loader"></div>
  </div>
</template>

<style>
.loader-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.loader {
  width: 10rem;
  height: 10rem;
}

.loader path {
  fill: var(--v-primary-lighten1);
}
</style>

<script lang="ts">
import Vue from "vue";
import lottie from "lottie-web";

export default Vue.extend({
  name: "Loader",
  props: {
    animationName: {
      type: String,
      required: false,
      default: "three-dots",
    },
    loop: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  methods: {
    /**
     * Render the lottie animation as a loader
     * @author: Austin Pearce
     */
    renderLoader(): void {
      this.$nextTick(() => {
        let element = document.getElementById("loader");
        if (element) {
          lottie.loadAnimation({
            container: element,
            renderer: "svg",
            loop: this.loop,
            autoplay: true,
            path: `animations/${this.animationName}.json`,
          });
        }
      });
    },
  },
  mounted() {
    this.renderLoader();
  },
});
</script>