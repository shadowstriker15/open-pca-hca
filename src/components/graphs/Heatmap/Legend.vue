<template>
  <g
    :transform="`translate(-${dimensions.additionalMarginLeft}, -${dimensions.additionalMarginTop})`"
  >
    <linear-gradient></linear-gradient>
    <rect x="0" y="0" width="250" height="20" fill="url(#legend-gradient)" />
    <div v-for="(tickValue, i) in ticks" :key="i">
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
        dominantBaseline="hanging"
        textAnchor="middle"
        fontSize="0.9em"
      >
        {{ tickValue }}
      </text>
    </div>
    <text x="0" y="45" dominantBaseline="hanging" textAnchor="left">
      {{ title }}
    </text>
  </g>
</template>

<script lang="ts">
import Vue from "vue";
import LinearGradient from "./LinearGradient.vue";
import * as d3 from "d3";

export default Vue.extend({
  components: { LinearGradient },
  name: "Legend",
  props: ["dimensions", "domain", "title"],
  data(): {
    ticks: number[];
    scale: d3.ScaleLinear<number, number>;
  } {
    return {
      ticks: [],
      scale: d3.scaleLinear(),
    };
  },
  mounted() {
    this.scale = d3.scaleLinear().domain(this.domain).range([0, 250]).nice();
    this.ticks = this.scale.ticks(5);
  },
});
</script>