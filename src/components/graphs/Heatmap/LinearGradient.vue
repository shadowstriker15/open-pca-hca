<template>
  <linearGradient id="legend-gradient">
    <stop
      v-for="(color, i) in results"
      :key="i"
      :offset="color.offset"
      :stopColor="color.color"
    />
  </linearGradient>
</template>

<script lang="ts">
import Vue from "vue";
import { MapNumToStr } from "./types";
import { PropType } from "vue";

export default Vue.extend({
  name: "LinearGradient",
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
          color: this.$parent.colorAccessor(i / 256),
        });
      }
    },
  },
  mounted() {
    this.createGradient();
  },
});
</script>