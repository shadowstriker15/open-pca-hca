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

import Loader from "../Loader.vue";

export default Vue.extend({
  name: "HeatmapWrapper",
  props: {
    type: {
      type: String,
      required: false,
      default: "default",
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
  } {
    return {
      data: [],
      yLabels: [],
      xLabels: [],
      matrix: new Matrix(0, 0),
      isLoading: true,
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
      handler() {
        this.getData();
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

      let sessionStr = localStorage.getItem("session");
      let session = JSON.parse(sessionStr) as session;
      const importDF = new ImportDF(session, true, true);
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
          this.data = importDF.computeDistanceMatrix(this.matrix);
        } else {
          this.data = this.matrix.to2DArray();
        }
        this.isLoading = false;
      });
    },
    customColorScale(value: number) {
      const convertScale = d3
        .scaleLinear()
        .range([this.minValue, this.maxValue]);
      const colorScaleNeg = d3
        .scaleSequential(d3.interpolateBlues) //interpolateRdYlGn
        .domain([-this.minValue, this.minValue]);

      const colorScalePos = d3
        .scaleSequential(d3.interpolateBlues)
        .domain([this.maxValue, -this.maxValue]);

      const converted = convertScale(value) as number;
      return converted < 0
        ? colorScaleNeg(converted)
        : colorScalePos(converted);
    },
  },
});
</script>