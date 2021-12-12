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
      :x="square.x"
      :y="square.y"
      :width="elementWidth"
      :height="elementHeight"
      :fill="square.color"
    />
  </g>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import * as d3 from "d3";
import { VueExtensions } from "@/main";
import { ChartDimensions } from "./utils";

interface SquareElement {
  i: number;
  j: number;
  x: number;
  y: number;
  color: number;
}

export default Vue.extend({
  name: "Map",
  props: {
    data: {
      type: Array as PropType<number[][]>,
      required: true,
    },
    dimensions: {
      type: Object as PropType<ChartDimensions>,
      required: true,
    },
    elementWidth: {
      type: Number,
      required: true,
    },
    elementHeight: {
      type: Number,
      required: true,
    },
    domain: {
      type: Array as PropType<number[]>,
      required: true,
    },
    xLabels: {
      type: Array as PropType<string[]>,
      required: true,
    },
    yLabels: {
      type: Array as PropType<string[]>,
      required: true,
    },
    colorScale: {
      type: Function as PropType<(t: number) => number>,
      required: true,
    },
  },
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
  computed: {
    timeoutTime() {
      const dataSize = this.data.length * this.data[0].length;
      return dataSize < 6000 ? 100 : 5000;
    },
  },
  watch: {
    dimensions: {
      deep: true,
      handler() {
        setTimeout(() => {
          this.getSquares();
        }, this.timeoutTime);
      },
    },
  },
  methods: {
    /**
     * Compute the squares for the heatmap
     * @author: Austin Pearce
     */
    getSquares() {
      let squares: SquareElement[] = [];
      for (let i = 0; i < this.data.length; i++) {
        for (let j = 0; j < this.data[i].length; j++) {
          let x = (this.$parent as VueExtensions).xScale(j);
          let y = (this.$parent as VueExtensions).yScale(i);

          let color = this.colorAccessor(this.data[i][j]);
          let square: SquareElement = {
            i: i,
            j: j,
            x: x,
            y: y,
            color: color as number,
          };
          squares.push(square);
        }
      }
      this.squares = squares;
    },
    /**
     * Prepare the data to show on tooltip
     * @param event The triggering mouse event
     * @param data The data of the map being hovered over
     * @author: Austin Pearce
     */
    createTooltip(
      event: MouseEvent,
      data: { x: number; y: number; z: number }
    ): void {
      let x = data.x.toString();
      let y = data.y.toString();

      if (this.xLabels) {
        x = this.xLabels[data.x];
      }
      if (this.yLabels) {
        y = this.yLabels[data.y];
      }

      let z = this.roundAccurately(data.z, 3);
      this.$emit("showTooltip", event, { x: x, y: y, z: z });
    },
    /**
     * Relay event to hide tooltip
     * @author: Austin Pearce
     */
    hideTooltip() {
      this.$emit("hideTooltip");
    },
    /**
     * Accurately round the passed value
     * @param num The number to round
     * @param decimalPlaces How many decimal places to round
     * @returns Rounded number
     * @author: Austin Pearce
     */
    roundAccurately(num: number, decimalPlaces: number): number {
      var accuracy = Math.pow(10, decimalPlaces || 0);
      return Math.round(num * accuracy) / accuracy;
    },
    /**
     * Color accessor for heatmap squares
     * @param num The value to get color for
     * @returns Value to be used to get the square's color
     * @author: Austin Pearce
     */
    colorAccessor(num: number): number | undefined {
      let accessor = d3
        .scaleSequential(this.colorScale)
        .domain(this.domain as [d3.NumberValue, d3.NumberValue]);
      return accessor(num);
    },
  },
  mounted() {
    this.getSquares();
  },
});
</script>