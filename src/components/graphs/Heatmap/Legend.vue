<template>
  <g
    :transform="`translate(-${dimensions.additionalMarginLeft}, -${dimensions.additionalMarginTop})`"
  >
    <gradient></gradient>
    <rect x="0" y="0" width="250" height="20" fill="url(#legend-gradient)" />
    <fragment v-for="(tickValue, i) in ticks" :key="i">
      <line
        :x1="scale(tickValue)"
        :x2="scale(tickValue)"
        y1="20"
        y2="25"
        stroke="black"
      />
      <text
        :x="scale(tickValue)"
        y="28"
        dominant-baseline="hanging"
        text-anchor="middle"
        font-size="0.9em"
      >
        {{ tickValue }}
      </text>
    </fragment>
    <text x="0" y="45" dominant-baseline="hanging" text-anchor="left">
      {{ title }}
    </text>
  </g>
</template>

<script lang="ts">
import Vue from "vue";
import Gradient from "./Gradient.vue";
import { Fragment } from "vue-fragment";
import * as d3 from "d3";

export default Vue.extend({
  components: { Gradient, Fragment },
  name: "Legend",
  props: ["dimensions", "domain", "colorAccessor", "title"],
  data(): {
    scale: d3.ScaleLinear<number, number>;
  } {
    return {
      scale: d3.scaleLinear().domain(this.domain).range([0, 250]).nice(),
    };
  },
  computed: {
    ticks: function () {
      return this.scale.ticks(5);
    },
  },
});
</script>