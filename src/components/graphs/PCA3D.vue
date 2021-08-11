<template>
  <div>
    <div id="test1" style="width: 100%; height: 100%"></div>
  </div>
</template>

<style scoped>
</style>
<script lang="ts">
import Vue from "vue";
import { ScatterData, newPlot } from "plotly.js/lib/core";

export default Vue.extend({
  name: "PCA3D",
  methods: {
    test() {
      let data: Array<ScatterData> = [];

      window.import.readPredictMatrix().then((matrix) => {
        for (const run in matrix.runs) {
          const items = matrix.runs[run].items;
          for (const item in items) {
            const trace = {
              x: [items[item][0]],
              y: [items[item][1]],
              z: [items[item][2]],
              mode: "markers",
              type: "scatter3d",
              name: run.substring(0, 10),
            } as ScatterData;
            data.push(trace);
          }
        }
        var graphDiv = document.getElementById("test1");
        if (graphDiv) {
          const layout = {
            title: "Sales Growth",
            xaxis: {
              title: "Year",
            },
            yaxis: {
              title: "Percent",
            },
            zaxis: {
              title: "Test",
            },
            uirevision: "true",
          };
          console.log("data:", data);
          newPlot(graphDiv, data, layout);
        }
      });
    },
  },
  mounted() {
    this.test();
  },
});
</script>
