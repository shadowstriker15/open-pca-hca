<template>
  <div class="loader-container h-100 w-100">
    <loader v-if="isLoading"></loader>
    <div style="height: 50rem" class="h-100 w-100" ref="hcaDendrogramGraph">
      <svg
        style="overflow: visible"
        :width="width"
        :height="height"
        id="hcaDendrogramSvg"
        xmlns="http://www.w3.org/2000/svg"
        :fill="graphColor"
      >
        <g :transform="`translate(${marginLeft}, ${marginTop})`">
          <g v-if="configs['orientation'] == 'vertical'">
            <XDendrogram
              v-if="hierarchy"
              :hierarchy="hierarchy"
              :height="boundedHeight"
              :width="boundedWidth"
              :translate="false"
            />
            <XAxis
              v-if="labels.length"
              :labels="labels"
              :height="boundedHeight"
            />
          </g>
          <g v-else-if="configs['orientation'] == 'horizontal'">
            <YAxis
              v-if="labels.length"
              :labels="labels"
              :width="boundedWidth"
              :translate="false"
            ></YAxis>
            <YDendrogram
              v-if="hierarchy"
              :hierarchy="hierarchy"
              :height="boundedHeight"
              :width="boundedWidth"
              translateType="right"
            ></YDendrogram>
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

// Components
import XDendrogram from "./Heatmap/XDendrogram.vue";
import XAxis from "./Heatmap/XAxis";
import YDendrogram from "./Heatmap/YDendrogram.vue";
import YAxis from "./Heatmap/YAxis";
import Loader from "../Loader.vue";
import ResizeObserver from "resize-observer-polyfill";

// Classes
import { ProgramSession } from "@/classes/programSession";
import { Graph } from "@/classes/graph";
import { ImportDF } from "@/classes/importDF";

// Types
import { GraphConfigs } from "@/@types/graphConfigs";
import { Import } from "@/@types/import";

import * as d3 from "d3";
import { agnes } from "ml-hclust";
import { Matrix, AbstractMatrix } from "ml-matrix";

export default Vue.extend({
  name: "HCADendrogram",
  props: {
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
    },
  },
  data(): {
    data: number[][];
    labels: string[];
    hierarchy: d3.HierarchyNode<any> | null;
    height: number;
    width: number;
    marginRight: number;
    marginTop: number;
    resizeObserver: ResizeObserver | null;
    isLoading: boolean;
    session: ProgramSession | null;
    importDF: ImportDF | null;
  } {
    return {
      data: [[]],
      labels: [],
      hierarchy: null,
      height: 0,
      width: 0,
      marginRight: 100,
      marginTop: 10,
      resizeObserver: null,
      isLoading: true,
      session: null,
      importDF: null,
    };
  },
  components: {
    XAxis,
    XDendrogram,
    YAxis,
    YDendrogram,
    loader: Loader,
  },
  watch: {
    data: function (data) {
      this.createHierarchy(data, this.configs["orientation"]);
    },
    configs: {
      deep: true,
      handler(val) {
        this.getData();
      },
    },
  },
  computed: {
    elementWidth(): number {
      return this.boundedWidth - this.xScale(this.data[0].length - 1);
    },
    elementHeight(): number {
      return this.boundedHeight - this.yScale(this.data.length - 1);
    },
    boundedWidth(): number {
      return this.width - this.marginLeft - this.marginRight;
    },
    boundedHeight(): number {
      return this.height - this.marginTop - this.marginBottom;
    },
    marginLeft(): number {
      return this.configs["orientation"] == "vertical" ? 100 : 200;
    },
    marginBottom(): number {
      return this.configs["orientation"] == "horizontal" ? 100 : 200;
    },
    graphColor(): string {
      return this.$vuetify.theme.dark ? "#ffffff" : "rgb(68, 68, 68)";
    },
  },
  methods: {
    /**
     * Initiate graph creation by requesting worker for import dataframe
     * @author: Austin Pearce
     */
    getData(): void {
      this.importDF = new ImportDF(new ProgramSession().session, true, true);
      // Request dataframe from worker
      this.importDF.readDF();
    },
    /**
     * Create observer to make graph responsive
     * @returns description
     * @author: Austin Pearce
     */
    resizeSVG(): void {
      if (this.width && this.height) return;

      const element = this.$refs.hcaDendrogramGraph;
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

        this.resizeObserver?.observe(element as Element);
      }
    },
    /**
     * Initiate dendrogram creation
     * @param data The distance matrix to be graphed
     * @param type The orientation of the graph
     * @returns description
     * @author: Austin Pearce
     */
    createHierarchy(data: number[][], type: "vertical" | "horizontal") {
      if (type == "vertical") this.createVerticalHierarchy(data);
      else if (type == "horizontal") this.createHorizontalHierarchy(data);
    },
    /**
     * Create horizontal dendrogram
     * @param data The distance matrix to graph
     * @author: Austin Pearce
     */
    createHorizontalHierarchy(data: number[][]): void {
      const transpose = new Matrix(data).transpose().to2DArray();

      const cluster = agnes(transpose, {
        method: this.configs["clusteringMethod"],
      });
      const d3Hierarchy = d3.hierarchy(cluster);

      const dataCopy: AbstractMatrix = new Matrix(data);
      let labelsCopy;
      if (this.labels) {
        labelsCopy = this.labels.slice();
      }

      const order = cluster.indices();
      for (let i = 0; i < order.length; i++) {
        if (order[i] !== i) {
          dataCopy.setColumn(i, transpose[order[i]]);
          if (labelsCopy && this.labels) {
            labelsCopy[i] = this.labels[order[i]];
          }
        }
      }

      this.hierarchy = d3Hierarchy;
      this.labels = labelsCopy as string[];
      this.isLoading = false;
    },
    /**
     * Create vertical dendrogram
     * @param data The distance matrix to graph
     * @author: Austin Pearce
     */
    createVerticalHierarchy(data: number[][]): void {
      const cluster = agnes(data, {
        method: this.configs["clusteringMethod"],
      });
      this.hierarchy = d3.hierarchy(cluster);

      const dataCopy = new Matrix(data);
      let labelsCopy;
      if (this.labels) {
        labelsCopy = this.labels.slice();
      }

      const order = cluster.indices();
      for (let i = 0; i < order.length; i++) {
        if (order[i] !== i) {
          dataCopy.setRow(i, data[order[i]]);
          if (labelsCopy && this.labels) {
            labelsCopy[i] = this.labels[order[i]];
          }
        }
      }
      if (labelsCopy) {
        this.labels = labelsCopy;
      }
      this.isLoading = false;
    },
    xAccessor(i: number): number {
      return this.xScale(i) + this.elementWidth / 2;
    },
    yAccessor(i: number): number {
      return this.yScale(i) + this.elementHeight / 2;
    },
    xScale(num: number): number {
      let scale = d3
        .scaleLinear()
        .domain([0, this.data[0].length])
        .range([0, this.boundedWidth]);
      return scale(num) ? (scale(num) as number) : 0;
    },
    yScale(num: number): number {
      let scale = d3
        .scaleLinear()
        .domain([0, this.data.length])
        .range([0, this.boundedHeight]);
      return scale(num) ? (scale(num) as number) : 0;
    },
    screenshotRequested() {
      const graph = new Graph("hca-dendrogram");
      let link = graph.createScreenshotLink("hcaDendrogramSvg");
      this.$emit("screenshotLink", link, graph.name);
    },
    handleImportDataframe(importObj: Import) {
      if (this.importDF) {
        const matrix = this.importDF.normalizeData(
          this.importDF.getNumbers(importObj.matrix),
          this.configs["normalize"]
        );

        this.labels = this.importDF.getClasses(importObj.matrix);

        this.importDF.computeDistanceMatrix(
          matrix.to2DArray(),
          this.importDF.getClasses(importObj.matrix),
          this.configs["normalize"]
        );
      }
    },
    handleDistanceMatrix(matrix: number[][]) {
      this.data = matrix;
      // Update normalization type
      if (this.session) {
        this.session.session.distance_normalize = this.configs.normalize;
        this.session.updateSession();
      }
    },
  },
  mounted() {
    this.session = new ProgramSession();
    this.getData();
    this.resizeSVG();
  },
});
</script>
