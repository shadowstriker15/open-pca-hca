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
import Vue from "vue";
import { MapNumToStr } from "./types";
import { PropType } from "vue";

export default Vue.extend({
  name: "Gradient",
  data(): {
    results: Array<any>;
  } {
    return {
      results: [],
    };
  },
  // props: {
  //   colorAccessor: {
  //     type: Object as PropType<MapNumToStr>,
  //     required: true,
  //   },
  // },
  methods: {
    createGradient(): void {
      for (let i = 0; i <= 256; i++) {
        this.results.push();
        this.results.push({
          offset: `${(i / 256) * 100}%`,
          color: this.$parent.$parent.colorScale(i / 256),
        });
      }
    },
  },
  mounted() {
    this.createGradient();
  },
});
</script>