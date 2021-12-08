<template>
  <defs>
    <linearGradient id="legend-gradient">
      <stop
        v-for="(color, i) in results"
        :key="i"
        :offset="color.offset"
        :stop-color="color.color"
      />
    </linearGradient>
  </defs>
</template>

<script lang="ts">
import { VueExtensions } from "@/main";
import Vue from "vue";

export default Vue.extend({
  name: "Gradient",
  data(): {
    results: Array<any>;
  } {
    return {
      results: [],
    };
  },
  methods: {
    /**
     * Create color gradient
     * @author: Austin Pearce
     */
    createGradient(): void {
      for (let i = 0; i <= 256; i++) {
        this.results.push();
        this.results.push({
          offset: `${(i / 256) * 100}%`,
          color: (this.$parent.$parent as VueExtensions).colorScale(i / 256),
        });
      }
    },
  },
  mounted() {
    this.createGradient();
  },
});
</script>