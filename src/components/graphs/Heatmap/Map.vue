<template>
  <g>
    <rect
      v-for="square in squares"
      @mousemove="
        createTooltip($event, {
          x: square.j,
          y: square.i,
          z: data[square.i][square.j],
        })
      "
      @mouseout="hideTooltip"
      :key="`${square.i}-${square.j}`"
      :x="$parent.xScale(square.j)"
      :y="$parent.yScale(square.i)"
      :width="elementWidth"
      :height="elementHeight"
      :fill="$parent.colorAccessor(data[square.i][square.j])"
    />
  </g>
</template>

<script lang="ts">
import Vue from "vue";
import * as d3 from "d3";
import { VueExtensions } from "@/main";

interface SquareElement {
  i: number;
  j: number;
}

export default Vue.extend({
  name: "Map",
  props: [
    //TODO PROP TYPE CHECKING
    "data",
    "xAccessor",
    "yAccessor",
    "elementWidth",
    "elementHeight",
    "domain",
    "xLabels",
    "yLabels",
    "colorScale",
  ],
  data(): {
    ticks: number[];
    scale: d3.ScaleLinear<number, number>;
    squares: SquareElement[];
  } {
    return {
      ticks: [],
      scale: d3.scaleLinear(),
      squares: [],
    };
  },
  methods: {
    getSquares() {
      let squares: SquareElement[] = [];
      for (let i = 0; i < this.data.length; i++) {
        for (let j = 0; j < this.data[i].length; j++) {
          squares.push({ i: i, j: j } as SquareElement);
        }
      }
      this.squares = squares;
    },
    createTooltip(
      event: MouseEvent,
      data: { x: string | number; y: string | number; z: number }
    ) {
      let x = data.x;
      let y = data.y;
      let z = data.z;

      if (this.xLabels) {
        x = this.xLabels[data.x];
      }
      if (this.yLabels) {
        y = this.yLabels[data.y];
      }

      z = this.roundAccurately(z, 3);
      this.$emit("showTooltip", event, { x: x, y: y, z: z });
    },
    hideTooltip() {
      this.$emit("hideTooltip");
    },
    roundAccurately(num: number, decimalPlaces: number): number {
      var accuracy = Math.pow(10, decimalPlaces || 0);
      return Math.round(num * accuracy) / accuracy;
    },
  },
  mounted() {
    this.getSquares();
  },
});
</script>