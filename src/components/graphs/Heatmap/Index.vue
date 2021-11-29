<template>
  <div style="height: 100%" ref="Heatmap">
    <svg
      style="overflow: visible"
      id="hcaHeatmapSvg"
      :width="dimensions.width"
      :height="dimensions.height"
      :fill="graphColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        :transform="`translate(${dimensions.marginLeft}, ${dimensions.marginTop})`"
      >
        <XAxis
          v-if="xLabels"
          :labels="xLabels"
          :height="dimensions.boundedHeight"
          :marginLeft="dimensions.marginLeft"
          :xLabel="type == 'default' ? 'Dimensions' : null"
        />
        <YAxis
          v-if="yLabels"
          :labels="yLabels"
          :width="dimensions.boundedWidth"
          position="right"
        />
        <Legend
          v-if="legend"
          :colorAccessor="colorScale"
          :title="legendTitle || ''"
          :domain="domain"
          :dimensions="dimensions"
        />
        <Map
          v-if="matrix.length"
          :data="matrix"
          :elementWidth="elementWidth"
          :elementHeight="elementHeight"
          :colorAccessor="colorAccessor"
          :domain="domain"
          :xLabels="xLabels"
          :yLabels="yLabels"
          :colorScale="colorScale"
          @showTooltip="handleTooltipShow"
          @hideTooltip="handleTooltipHide"
        />
        <XDendrogram
          v-if="xHierarchy"
          :hierarchy="xHierarchy"
          :height="xClusteringHeight"
          :width="dimensions.boundedWidth"
        />
        <YDendrogram
          v-if="yHierarchy"
          :hierarchy="yHierarchy"
          :height="dimensions.boundedHeight"
          :width="yClusteringWidth"
        />
      </g>
      <!-- Tooltip -->
      <tooltip ref="tooltip"></tooltip>
    </svg>
  </div>
</template>

<script lang="ts">
import * as d3 from "d3";
import Vue, { PropType } from "vue";
import { agnes, AgglomerationMethod, Cluster } from "ml-hclust";
import { Matrix, AbstractMatrix } from "ml-matrix";

// Components
import Map from "./Map.vue";
import XAxis from "./XAxis";
import YAxis from "./YAxis";
import XDendrogram from "./XDendrogram.vue";
import YDendrogram from "./YDendrogram.vue";
import Legend from "./Legend.vue";
import Tooltip from "./Tooltip.vue";

import ResizeObserver from "resize-observer-polyfill";
import { Clustering } from "../../../@types/graphConfigs";
import { ChartDimensions, ChartDimensionsConfig } from "./utils";
import { VueExtensions } from "@/main";
import { HeatmapType } from "@/@types/graphs";

const legendOffset = 80;

export default Vue.extend({
  name: "HeatMap",
  props: {
    type: {
      type: String as PropType<HeatmapType>,
      required: true,
    },
    passedMatrix: {
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
    xClusteringMethod: {
      type: String as PropType<Clustering>,
      required: false,
      default: "complete" as Clustering,
    },
    yClusteringMethod: {
      type: String as PropType<Clustering>,
      required: false,
      default: "complete" as Clustering,
    },
    colorScale: {
      type: Function as PropType<(t: number) => number>,
      required: true,
    },
  },
  data(): {
    //TODO CLEAN THIS UP (MAY NOT NEED ALL THESE VALUES)
    matrix: number[][];
    legend: Boolean;
    legendTitle: String;
    xClustering: Boolean;
    xClusteringHeight: number;
    yClustering: Boolean;
    yClusteringWidth: number;
    additionalMarginLeft: number;
    additionalMarginTop: number;
    xHierarchy: d3.HierarchyNode<any> | null;
    yHierarchy: d3.HierarchyNode<any> | null;
    width: number;
    height: number;
    resizeObserver: ResizeObserver | null;
  } {
    return {
      matrix: [],
      legend: true,
      legendTitle: "",
      xClustering: true,
      xClusteringHeight: 150,
      yClustering: true,
      yClusteringWidth: 150,
      additionalMarginLeft: 0,
      additionalMarginTop: 0,
      xHierarchy: null,
      yHierarchy: null,
      width: 0,
      height: 0,
      resizeObserver: null,
    };
  },
  components: {
    Map,
    XAxis,
    YAxis,
    XDendrogram,
    YDendrogram,
    Legend,
    Tooltip,
  },
  watch: {
    config: {
      deep: true,
      handler() {
        this.resizeHeatmap();
      },
    },
    additionalMarginLeft() {
      this.resizeHeatmap();
    },
    additionalMarginRight() {
      this.resizeHeatmap();
    },
    xClusteringMethod() {
      this.performClustering();
    },
    yClusteringMethod() {
      this.performClustering();
    },
  },
  computed: {
    dimensions(): ChartDimensions {
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
    domain(): [number, number] {
      let globalMin = Infinity;
      let globalMax = -Infinity;
      for (const datum of this.matrix) {
        const [min, max] = d3.extent(datum);
        if (min === undefined || max === undefined) {
          throw new Error("cannot work without min or max");
        }
        if (min < globalMin) globalMin = min;
        if (max > globalMax) globalMax = max;
      }
      return [globalMin, globalMax];
    },
    elementWidth(): number {
      return (
        this.dimensions.boundedWidth -
        this.xScale(this.passedMatrix[0].length - 1)
      );
    },
    elementHeight(): number {
      return (
        this.dimensions.boundedHeight -
        this.yScale(this.passedMatrix.length - 1)
      );
    },
    graphColor(): string {
      return this.$vuetify.theme.dark ? "#ffffff" : "rgb(68, 68, 68)";
    },
  },
  methods: {
    resizeHeatmap() {
      if (this.width && this.height) return undefined;

      const element = this.$refs.Heatmap;
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(element as Element);
      }

      if (element) {
        this.resizeObserver = new ResizeObserver(
          (entries: ResizeObserverEntry[]) => {
            if (!Array.isArray(entries)) return;
            if (!entries.length) return;

            const entry = entries[0];

            if (this.width !== entry.contentRect.width) {
              this.width = entry.contentRect.width;
            }
            if (this.height !== entry.contentRect.height) {
              this.height = entry.contentRect.height;
            }
          }
        );

        this.resizeObserver.observe(element as Element);
      }
    },
    useYClustering(data: number[][]) {
      if (!this.yClustering) {
        return data;
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
      return dataCopy.to2DArray();
    },
    useXClustering(data: number[][]): number[][] {
      if (!this.xClustering) {
        return data;
      }

      const transpose = new Matrix(data).transpose().to2DArray();

      const cluster = agnes(transpose, {
        method: this.xClusteringMethod,
      });
      const d3Hierarchy = d3.hierarchy(cluster);

      const dataCopy: AbstractMatrix = new Matrix(data);
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
    xScale(num: number): number {
      let scale = d3
        .scaleLinear()
        .domain([0, this.passedMatrix[0].length])
        .range([0, this.dimensions.boundedWidth]);
      return scale(num) ? (scale(num) as number) : 0;
    },
    yScale(num: number): number {
      let scale = d3
        .scaleLinear()
        .domain([0, this.passedMatrix.length])
        .range([0, this.dimensions.boundedHeight]);
      return scale(num) ? (scale(num) as number) : 0;
    },
    colorAccessor(num: number): number | undefined {
      let accessor = d3.scaleSequential(this.colorScale).domain(this.domain);
      return accessor(num);
    },
    performClustering() {
      let dataAfterX = this.useXClustering(this.passedMatrix);
      this.matrix = this.useYClustering(dataAfterX);
    },
    handleTooltipShow(
      event: MouseEvent,
      data: { x: string | number; y: string | number; z: number }
    ) {
      const tooltip = this.$refs.tooltip as VueExtensions;
      tooltip.showTooltip(event, data);
    },
    handleTooltipHide() {
      const tooltip = this.$refs.tooltip as VueExtensions;
      tooltip.hideTooltip();
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

    this.performClustering();
    this.resizeHeatmap();
  },
});
</script>