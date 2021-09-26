<template>
  <div style="height: 100%" ref="Heatmap">
    <div id="square-tooltip" display="none"></div>
    <svg
      style="overflow: visible"
      :width="dimensions.width"
      :height="dimensions.height"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        :transform="`translate(${dimensions.marginLeft}, ${dimensions.marginTop})`"
      >
        <XAxis v-if="xLabels" :labels="xLabels" :dimensions="dimensions" />
        <YAxis v-if="yLabels" :labels="yLabels" :dimensions="dimensions" />
        <Legend
          v-if="legend"
          :colorAccessor="colorScale"
          :title="legendTitle || ''"
          :domain="domain"
          :dimensions="dimensions"
        />
        <Map
          :data="data"
          :elementWidth="elementWidth"
          :elementHeight="elementHeight"
          :colorAccessor="colorAccessor"
          :domain="domain"
          :xLabels="xLabels"
          :yLabels="yLabels"
          :colorScale="colorScale"
        />
        <XDendrogram
          v-if="xHierarchy"
          :hierarchy="xHierarchy"
          :height="xClusteringHeight"
          :dimensions="dimensions"
        />
        <YDendrogram
          v-if="yHierarchy"
          :hierarchy="yHierarchy"
          :width="yClusteringWidth"
          :dimensions="dimensions"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
#square-tooltip {
  position: absolute;
  background: white;
  border: 1px solid #aaaaaa;
  border-radius: 0.5rem;
  padding: 5px;
  user-select: none;
  z-index: 1000;
}
</style>

<script lang="ts">
import * as d3 from "d3";
import Vue, { PropType } from "vue";
import { agnes, AgglomerationMethod, Cluster } from "ml-hclust";
import { Matrix, AbstractMatrix } from "ml-matrix";

import Map from "./Map.vue";
import XAxis from "./XAxis";
import YAxis from "./YAxis";
import XDendrogram from "./XDendrogram.vue";
import YDendrogram from "./YDendrogram.vue";
import Legend from "./Legend.vue";
import { ChartDimensions, ChartDimensionsConfig } from "./utils";

import ResizeObserver from "resize-observer-polyfill";
import { MapNumToNum } from "./types";

const legendOffset = 80;

export default Vue.extend({
  name: "HeatMap",
  props: {
    data: {
      type: Array as PropType<number[][]>,
      required: true,
    },
    config: {
      type: Object as PropType<ChartDimensionsConfig>,
      required: false,
    },
    xLabels: {
      type: Array as PropType<string[]>,
      required: false,
    },
    yLabels: {
      type: Array as PropType<string[]>,
      required: false,
    },
  },
  data(): {
    //TODO CLEAN THIS UP (MAY NOT NEED ALL THESE VALUES)
    colorScale: (t: number) => string;
    legend: Boolean;
    legendTitle: String;
    xClustering: Boolean;
    xClusteringHeight: number;
    xClusteringMethod: AgglomerationMethod;
    yClustering: Boolean;
    yClusteringWidth: number;
    yClusteringMethod: AgglomerationMethod;
    additionalMarginLeft: number;
    additionalMarginTop: number;
    xHierarchy: any;
    yHierarchy: any;
    width: number;
    height: number;
  } {
    return {
      colorScale: d3.interpolateYlOrRd,
      legend: true,
      legendTitle: "Iris values (normalized)",
      xClustering: true,
      xClusteringHeight: 150,
      xClusteringMethod: "complete",
      yClustering: true,
      yClusteringWidth: 150,
      yClusteringMethod: "complete",
      additionalMarginLeft: 0,
      additionalMarginTop: 0,
      xHierarchy: null,
      yHierarchy: null,
      width: 0,
      height: 0,
    };
  },
  components: {
    Map,
    XAxis,
    YAxis,
    XDendrogram,
    YDendrogram,
    Legend,
  },
  watch: {
    config: {
      deep: true,
      handler() {
        this.resizeHeatmap();
      },
    },
    additionalMarginLeft: function () {
      this.resizeHeatmap();
    },
    additionalMarginRight: function () {
      this.resizeHeatmap();
    },
  },
  computed: {
    dimensions: function (): ChartDimensions {
      let parsedDimensions = {
        marginTop: 5,
        marginRight: 5,
        marginBottom: 5,
        marginLeft: 5,
        width: this.width,
        height: this.height,
        additionalMarginLeft: this.additionalMarginLeft,
        additionalMarginTop: this.additionalMarginTop,
        ...this.config,
      };

      parsedDimensions.marginLeft += this.additionalMarginLeft;
      parsedDimensions.marginTop += this.additionalMarginTop;

      return {
        ...parsedDimensions,
        boundedHeight: Math.max(
          (parsedDimensions.height || 0) -
            parsedDimensions.marginTop -
            parsedDimensions.marginBottom,
          0
        ),
        boundedWidth: Math.max(
          (parsedDimensions.width || 0) -
            parsedDimensions.marginLeft -
            parsedDimensions.marginRight,
          0
        ),
      };
    },
    domain: function (): [number, number] {
      let globalMin = Infinity;
      let globalMax = -Infinity;
      for (const datum of this.data) {
        const [min, max] = d3.extent(datum);
        if (min === undefined || max === undefined) {
          throw new Error("cannot work without min or max");
        }
        if (min < globalMin) globalMin = min;
        if (max > globalMax) globalMax = max;
      }
      return [globalMin, globalMax];
    },
    elementWidth: function () {
      return (
        this.dimensions.boundedWidth - this.xScale(this.data[0].length - 1)
      );
    },
    elementHeight: function () {
      return this.dimensions.boundedHeight - this.yScale(this.data.length - 1);
    },
  },
  methods: {
    resizeHeatmap() {
      if (this.width && this.height) return undefined;

      const element = this.$refs.Heatmap;
      const resizeObserver = new ResizeObserver((entries) => {
        if (!Array.isArray(entries)) return;
        if (!entries.length) return;

        const entry = entries[0];

        if (this.width !== entry.contentRect.width) {
          this.width = entry.contentRect.width;
        }
        if (this.height !== entry.contentRect.height) {
          this.height = entry.contentRect.height;
        }
      });

      resizeObserver.observe(element as Element);
    },
    useYClustering(data: number[][]) {
      if (!this.yClustering) {
        return;
      }
      const cluster = agnes(data, {
        method: this.yClusteringMethod,
      });
      this.yHierarchy = d3.hierarchy(cluster);

      const dataCopy = new Matrix(data);
      let yLabelsCopy;
      if (this.yLabels) {
        yLabelsCopy = this.yLabels.slice();
      }

      const order = cluster.indices();
      for (let i = 0; i < order.length; i++) {
        if (order[i] !== i) {
          dataCopy.setRow(i, data[order[i]]);
          if (yLabelsCopy && this.yLabels) {
            yLabelsCopy[i] = this.yLabels[order[i]];
          }
        }
      }
      if (yLabelsCopy) {
        this.$emit("update:yLabels", yLabelsCopy);
      }
    },
    useXClustering(): number[][] | undefined {
      if (!this.xClustering) {
        return;
      }

      const transpose = new Matrix(this.data).transpose().to2DArray();

      const cluster = agnes(transpose, {
        method: this.xClusteringMethod,
      });
      const d3Hierarchy = d3.hierarchy(cluster);

      const dataCopy: AbstractMatrix = new Matrix(this.data);
      let yLabelsCopy;
      if (this.xLabels) {
        yLabelsCopy = this.xLabels.slice();
      }

      const order = cluster.indices();
      for (let i = 0; i < order.length; i++) {
        if (order[i] !== i) {
          dataCopy.setColumn(i, transpose[order[i]]);
          if (yLabelsCopy && this.xLabels) {
            yLabelsCopy[i] = this.xLabels[order[i]];
          }
        }
      }

      this.xHierarchy = d3Hierarchy;
      this.$emit("update:xLabels", yLabelsCopy);
      return dataCopy.to2DArray();
    },
    xAccessor(i: number): number {
      let x = this.xScale(i);
      if (x != undefined) return x + this.elementWidth / 2;
      return 0;
    },
    yAccessor(i: number): number {
      let y = this.yScale(i);
      if (y != undefined) return y + this.elementHeight / 2;
      return 0;
    },
    xScale(num: number): number | undefined {
      let scale = d3
        .scaleLinear()
        .domain([0, this.data[0].length])
        .range([0, this.dimensions.boundedWidth]);
      return scale(num);
    },
    yScale(num: number): number | undefined {
      let scale = d3
        .scaleLinear()
        .domain([0, this.data.length])
        .range([0, this.dimensions.boundedHeight]);
      return scale(num);
    },
    colorAccessor(num: number): string | undefined {
      let accessor = d3.scaleSequential(this.colorScale).domain(this.domain);
      return accessor(num);
    },
    showTooltip(event: MouseEvent, text: string) {
      let tooltip = document.getElementById("square-tooltip");
      if (tooltip) {
        tooltip.innerHTML = text;
        tooltip.style.display = "block";

        tooltip.style.left = `${event.pageX - 50}px`;
        tooltip.style.top = `${event.pageY - 10}px`;
      }
    },
    hideTooltip() {
      let tooltip = document.getElementById("square-tooltip");
      if (tooltip) tooltip.style.display = "none";
    },
  },
  mounted() {
    if (this.legend) {
      this.additionalMarginTop += legendOffset;
    }
    if (this.xClustering) {
      this.additionalMarginTop += this.xClusteringHeight;
    }
    if (this.yClustering) {
      this.additionalMarginLeft += this.yClusteringWidth;
    }

    let dataAfterX = this.useXClustering();
    if (dataAfterX) this.useYClustering(dataAfterX);

    this.resizeHeatmap();
  },
});
</script>