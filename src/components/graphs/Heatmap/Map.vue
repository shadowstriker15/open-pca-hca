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
import Vue, { PropType } from "vue";
import * as d3 from "d3";

interface SquareElement {
  i: number;
  j: number;
}

export default Vue.extend({
  name: "Map",
  props: {
    data: {
      type: Array as PropType<number[][]>,
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
    xLabels: {
      type: Array as PropType<string[]>,
      required: true,
    },
    yLabels: {
      type: Array as PropType<string[]>,
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
  methods: {
    /**
     * Compute the squares for the heatmap
     * @author: Austin Pearce
     */
    getSquares() {
      let squares: SquareElement[] = [];
      for (let i = 0; i < this.data.length; i++) {
        for (let j = 0; j < this.data[i].length; j++) {
          squares.push({ i: i, j: j } as SquareElement);
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
  },
  mounted() {
    this.getSquares();
  },
});
</script>