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
        :config="{
          marginLeft: 5,
          marginTop: 5,
          marginBottom: 100,
          marginRight: 150,
        }"
        :data="irisData"
        :yLabels.sync="yLabels"
        :xLabels.sync="xLabels"
      />
    </div>
  </div>
</template>

<style scoped>
</style>
<script lang="ts">
import Vue from "vue";
import Heatmap from "./Heatmap/Index.vue";
import { getNumbers, getClasses } from "ml-dataset-iris";
import { Matrix } from "ml-matrix";

export default Vue.extend({
  name: "ShowHeatmap",

  data(): {
    irisData: number[][];
    yLabels: string[];
    xLabels: string[];
  } {
    return {
      irisData: this.getData(),
      yLabels: getClasses(),
      xLabels: ["sepal length", "sepal width", "petal length", "petal width"],
    };
  },
  components: {
    Heatmap,
  },
  methods: {
    getData() {
      const irisNumbers = new Matrix(getNumbers())
        .center("column")
        .scale("column");
      return irisNumbers.to2DArray();
    },
  },
});
</script>