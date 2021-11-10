<template>
  <div class="loader-container h-100 w-100">
    <loader v-if="isLoading"></loader>
    <div style="height: 50rem" class="h-100 w-100" ref="hcaDendrogram">
      <svg
        style="overflow: visible"
        :width="width"
        :height="height"
        xmlns="http://www.w3.org/2000/svg"
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
import Vue from "vue";
import { PropType } from "vue";

// Components
import XDendrogram from "./Heatmap/XDendrogram.vue";
import XAxis from "./Heatmap/XAxis";
import YDendrogram from "./Heatmap/YDendrogram.vue";
import YAxis from "./Heatmap/YAxis";
import Loader from "../Loader.vue";

// Misc
import * as d3 from "d3";
import { ImportDF } from "../../classes/importDF";
import { agnes } from "ml-hclust";
import { Matrix, AbstractMatrix } from "ml-matrix";
import { GraphConfigs } from "../../@types/graphConfigs";

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
  } {
    return {
      data: [],
      labels: [],
      hierarchy: null,
      height: 0,
      width: 0,
      marginRight: 100,
      marginTop: 10,
      resizeObserver: null,
      isLoading: true,
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
      handler(configs) {
        this.createHierarchy(this.data, configs);
        this.readDataframe();
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
  },
  methods: {
    readDataframe() {
      let sessionStr = localStorage.getItem("session");
      let session = JSON.parse(sessionStr) as session;

      const importDF = new ImportDF(session, true, true);
      importDF.readDF().then((importObj) => {
        const matrix = importDF.normalizeData(
          importDF.getNumbers(importObj.matrix),
          this.configs["normalize"]
        );

        this.data = importDF.computeDistanceMatrix(matrix);
        this.labels = importDF.getClasses(importObj.matrix);
        this.isLoading = false;
      });
    },
    resizeSVG() {
      if (this.width && this.height) return undefined;

      const element = this.$refs.hcaDendrogram;
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(element as Element);
      }

      if (element) {
        this.resizeObserver = new ResizeObserver((entries) => {
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

        this.resizeObserver.observe(element as Element);
      }
    },
    createHierarchy(data: number[][], type: "vertical" | "horizontal") {
      if (type == "vertical") this.createVerticalHierarchy(data);
      else if (type == "horizontal") this.createHorizontalHierarchy(data);
    },
    createHorizontalHierarchy(data: number[][]) {
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
    },
    createVerticalHierarchy(data: number[][]) {
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
        .range([0, this.boundedWidth]);
      return scale(num);
    },
    yScale(num: number): number | undefined {
      let scale = d3
        .scaleLinear()
        .domain([0, this.data.length])
        .range([0, this.boundedHeight]);
      return scale(num);
    },
  },
  mounted() {
    this.readDataframe();
    this.resizeSVG();
  },
});
</script>
