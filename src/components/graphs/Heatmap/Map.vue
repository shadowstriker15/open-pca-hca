<template>
  <g>
    <rect
      v-for="square in squares"
      :key="`${square.i}-${square.j}`"
      :x="$parent.xAccessor(square.j)"
      :y="$parent.yAccessor(square.i)"
      :width="elementWidth"
      :height="elementHeight"
      :fill="colorAccessor(data[square.i][square.j])"
    />
  </g>
</template>

<script lang="ts">
import Vue from "vue";
import * as d3 from "d3";

interface SquareElement {
  i: number;
  j: number;
}

export default Vue.extend({
  name: "Map",
  props: [
    "data",
    "xAccessor",
    "yAccessor",
    "elementWidth",
    "elementHeight",
    "domain",
    "colorScale",
  ],
  data(): {
    ticks: number[];
    scale: d3.ScaleLinear<number, number>;
    colorAccessor: any;
    squares: SquareElement[];
  } {
    return {
      ticks: [],
      scale: d3.scaleLinear(),
      colorAccessor: null,
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
  },
  mounted() {
    this.colorAccessor = d3
      .scaleSequential(this.colorScale)
      .domain(this.domain);
    this.getSquares();
  },
});
</script>