<template>
  <div>
    <!-- <Heatmap
      :config="{ height: 400 }"
      :data="[
        [-20, -15, -10],
        [-5, 0, 5],
        [10, 15, 20],
      ]"
      :xLabels="['Column 1', 'Column 2', 'Column 3']"
    /> -->
    <div style="height: 100%">
      <Heatmap
        v-if="data.length"
        :config="{
          marginLeft: 5,
          marginTop: 5,
          marginBottom: 100,
          marginRight: 150,
        }"
        :data.sync="data"
        :yLabels.sync="yLabels"
        :xLabels.sync="xLabels"
        :colorScale="customColorScale"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Heatmap from "./Heatmap/Index.vue";
// import { getNumbers, getClasses } from "ml-dataset-iris"; // TODO EITHER UNINSTALL OR USE FOR TESTING
import { Matrix } from "ml-matrix";
import * as d3 from "d3";

export default Vue.extend({
  name: "HeatmapWrapper",

  data(): {
    data: number[][];
    yLabels: string[];
    xLabels: string[];
    matrix: Matrix;
  } {
    return {
      data: [],
      yLabels: [],
      xLabels: [],
      matrix: new Matrix(0, 0),
    };
  },
  components: {
    Heatmap,
  },
  computed: {
    minValue: function () {
      return this.matrix.min();
    },
    maxValue: function () {
      return this.matrix.max();
    },
  },
  methods: {
    getClasses(matrix: any[][]) {
      return matrix.map((row) => row[matrix[0].length - 1]);
    },
    getNumbers(matrix: any[][]) {
      return matrix.map(
        (row) => row.slice(0, matrix[0].length - 1) as number[]
      );
    },
    getData() {
      window.import.readImportDataframe(true, true).then((importObj) => {
        this.yLabels = this.getClasses(importObj.matrix);
        this.xLabels = importObj.dimensionLabels as string[];

        this.matrix = new Matrix(this.getNumbers(importObj.matrix))
          .center("column")
          .scale("column");
        this.data = this.matrix.to2DArray();
      });
    },
    customColorScale(value: number) {
      const convertScale = d3
        .scaleLinear()
        .range([this.minValue, this.maxValue]);
      const colorScaleNeg = d3
        .scaleSequential(d3.interpolateRdBu) //interpolateRdYlGn
        .domain([this.minValue, -this.minValue]);

      const colorScalePos = d3
        .scaleSequential(d3.interpolateRdBu)
        .domain([-this.maxValue, this.maxValue]);

      const converted = convertScale(value) as number;
      return converted < 0
        ? colorScaleNeg(converted)
        : colorScalePos(converted);
    },
  },
  mounted() {
    this.getData();
  },
});
</script>