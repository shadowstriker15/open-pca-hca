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
          :fontSize="configs['labelSize']"
        />
        <YAxis
          v-if="yLabels"
          :labels="yLabels"
          :width="dimensions.boundedWidth"
          position="right"
          :fontSize="configs['labelSize']"
        />
        <Legend
          v-if="legend"
          :title="legendTitle || ''"
          :domain="domain"
          :dimensions="dimensions"
        />
        <Map
          v-if="
            matrix.length && dimensions.boundedWidth && dimensions.boundedHeight
          "
          :data="matrix"
          :dimensions="dimensions"
          :elementWidth="elementWidth"
          :elementHeight="elementHeight"
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
import Vue, { PropType } from "vue";

import * as d3 from "d3";
import { agnes } from "ml-hclust";
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
import { Clustering, GraphConfigs } from "@/@types/graphConfigs";
import { ChartDimensions, ChartDimensionsConfig } from "./utils";
import { VueExtensions } from "@/main";
import { HeatmapType } from "@/@types/graphs";
import { ProgramSession } from "@/classes/programSession";

const legendOffset = 80;

export default Vue.extend({
  name: "HeatMap",
  props: {
    session: {
      type: Object as PropType<ProgramSession | null>,
      required: true,
    },
    type: {
      type: String as PropType<HeatmapType>,
      required: true,
    },
    passedMatrix: {
      type: Array as PropType<number[][]>,
      required: true,
    },
    layoutConfig: {
      type: Object as PropType<ChartDimensionsConfig>,
      required: false,
    },
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
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
    layoutConfig: {
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
        ...this.layoutConfig,
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
    /**
     * Used to make heatmap responsive
     * @author: Austin Pearce
     */
    resizeHeatmap(): void {
      if (this.width && this.height) return;

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
    /**
     * Perform clusting for y axis
     * @param data Matrix of data to create dendrogram with
     * @return Matrix after clustering
     * @author: Austin Pearce
     */
    useYClustering(data: number[][]): number[][] {
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
      console.log("Completed Y Clustering");
      return dataCopy.to2DArray();
    },
    /**
     * Perform clustering for x axis
     * @param data Matrix of data to create dendrogram with
     * @returns Matrix after clustering
     * @author: Austin Pearce
     */
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
      console.log("Completed X Clustering");

      return dataCopy.to2DArray();
    },
    /**
     * Used for x axis for horizontally positioning
     * @param i Number to scale horizontally
     * @returns Scaled x value
     * @author: Austin Pearce
     */
    xAccessor(i: number): number {
      let x = this.xScale(i);
      if (x != undefined) return x + this.elementWidth / 2;
      return 0;
    },
    /**
     * Used for y axis for vertically positioning
     * @param i Number to scale vertically
     * @returns Scaled y value
     * @author: Austin Pearce
     */
    yAccessor(i: number): number {
      let y = this.yScale(i);
      if (y != undefined) return y + this.elementHeight / 2;
      return 0;
    },
    /**
     * Method to determine where to position square horizontally with scaling
     * @param num Number to scale horizontally
     * @returns Scaled x value
     * @author: Austin Pearce
     */
    xScale(num: number): number {
      let scale = d3
        .scaleLinear()
        .domain([0, this.passedMatrix[0].length])
        .range([0, this.dimensions.boundedWidth]);
      return scale(num) as number;
    },
    /**
     * Method to determine where to position square vertically with scaling
     * @param num Number to scale vertically
     * @returns Scaled y value
     * @author: Austin Pearce
     */
    yScale(num: number): number {
      let scale = d3
        .scaleLinear()
        .domain([0, this.passedMatrix.length])
        .range([0, this.dimensions.boundedHeight]);
      return scale(num) as number;
    },
    /**
     * Wrapper method to check and perform clustering
     * @author: Austin Pearce
     */
    performClustering(): void {
      let dataAfterX = this.useXClustering(this.passedMatrix);
      this.matrix = this.useYClustering(dataAfterX);
    },
    /**
     * Handler to show tooltip
     * @author: Austin Pearce
     */
    handleTooltipShow(
      event: MouseEvent,
      data: { x: string | number; y: string | number; z: number }
    ): void {
      const tooltip = this.$refs.tooltip as VueExtensions;
      tooltip.showTooltip(event, data);
    },
    /**
     * Handler to hide tooltip
     * @author: Austin Pearce
     */
    handleTooltipHide(): void {
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