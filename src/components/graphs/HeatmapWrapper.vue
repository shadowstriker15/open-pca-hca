<template>
  <!-- <Heatmap
      :config="{ height: 400 }"
      :data="[
        [-20, -15, -10],
        [-5, 0, 5],
        [10, 15, 20],
      ]"
      :xLabels="['Column 1', 'Column 2', 'Column 3']"
    /> -->
  <div class="loader-container h-100 w-100">
    <loader v-if="isLoading"></loader>
    <div v-else class="h-100">
      <Heatmap
        :type="type"
        :config="{
          marginLeft: 5,
          marginTop: 5,
          marginBottom: 100,
          marginRight: 150,
        }"
        :passedMatrix="data"
        :yLabels.sync="yLabels"
        :xLabels.sync="xLabels"
        :xClusteringMethod="configs['xClusteringMethod']"
        :yClusteringMethod="configs['yClusteringMethod']"
        :colorScale="customColorScale"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { PropType } from "vue";
import Heatmap from "./Heatmap/Index.vue";
// import { getNumbers, getClasses } from "ml-dataset-iris"; // TODO EITHER UNINSTALL OR USE FOR TESTING
import { Matrix } from "ml-matrix";
import * as d3 from "d3";
import { ImportDF } from "../../classes/importDF";
import { GraphConfigs } from "@/@types/graphConfigs";
import { HCAHeatmaps, HeatmapType } from "@/@types/graphs";

import Loader from "../Loader.vue";
import { Session } from "@/classes/session";
import { Graph } from "@/classes/graph";

export default Vue.extend({
  name: "HeatmapWrapper",
  props: {
    type: {
      type: String as PropType<HeatmapType>,
      required: false,
      default: "default" as HeatmapType,
    },
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
    },
  },
  data(): {
    data: number[][];
    yLabels: string[];
    xLabels: string[];
    matrix: Matrix;
    isLoading: boolean;
    session: Session | null;
  } {
    return {
      data: [],
      yLabels: [],
      xLabels: [],
      matrix: new Matrix(0, 0),
      isLoading: true,
      session: null,
    };
  },
  components: {
    Heatmap,
    loader: Loader,
  },
  watch: {
    type: {
      immediate: true,
      handler() {
        this.getData();
      },
    },
    configs: {
      deep: true,
      handler(val) {
        this.getData().then(() => {
          if (this.session) {
            this.session.session.distance_normalize = val.normalize; //TODO REWORD THIS
            this.session.updateSession();
          }
        });
      },
    },
  },
  computed: {
    minValue: function (): number {
      return this.matrix.min();
    },
    maxValue: function (): number {
      return this.matrix.max();
    },
  },
  methods: {
    getData() {
      this.isLoading = true;
      const importDF = new ImportDF(new Session().session, true, true);

      return new Promise<void>((resolve, reject) => {
        importDF.readDF().then((importObj) => {
          this.yLabels = importDF.getClasses(importObj.matrix);

          if (this.type == "distance") {
            this.xLabels = this.yLabels;
          } else {
            this.xLabels = importObj.dimensionLabels as string[];
          }

          this.matrix = importDF.normalizeData(
            importDF.getNumbers(importObj.matrix),
            this.configs["normalize"]
          );

          if (this.type == "distance") {
            importDF
              .computeDistanceMatrix(
                this.matrix.to2DArray(),
                importDF.getClasses(importObj.matrix),
                this.configs["normalize"]
              )
              .then((distMatrix) => {
                this.data = distMatrix;
                this.isLoading = false;
                resolve();
              });
          } else {
            this.data = this.matrix.to2DArray();
            this.isLoading = false;
            resolve();
          }
        });
      });
    },
    customColorScale(value: number) {
      const convertScale = d3
        .scaleLinear()
        .range([this.minValue, this.maxValue]);

      // <= 0 results in the same color intensity
      const colorScaleNeg = d3
        .scaleSequential(d3.interpolateBlues)
        .domain([0, 0]);
      // .domain([-this.minValue, this.minValue]);

      const colorScalePos = d3
        .scaleSequential(d3.interpolateBlues)
        .domain([this.maxValue, -this.maxValue]);

      const converted = convertScale(value) as number;
      return converted < 0
        ? colorScaleNeg(converted)
        : colorScalePos(converted);
    },
    screenshotRequested() {
      const graph = new Graph("hca-heatmap", this.type);
      let link = graph.createScreenshotLink("hcaHeatmapSvg");
      this.$emit("screenshotLink", link, graph.name);
    },
  },
  mounted() {
    this.session = new Session();
  },
});
</script>