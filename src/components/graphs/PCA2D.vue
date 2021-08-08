<template>
  <div>
    <div id="test" style="width: 600px; height: 500px"></div>
  </div>
</template>

<style scoped>
</style>
<script lang="ts">
import Vue from "vue";
import * as Plotly from "plotly.js/lib/core";
import {
  Datum,
  ScatterData,
  Layout,
  newPlot,
  PlotData,
  ViolinData,
  CandlestickData,
  PieData,
} from "plotly.js/lib/core";
import { PredictMatrix } from "../../interfaces/Predict/Matrix";

export default Vue.extend({
  name: "PCA2D",

  data(): {
    items: Array<{ title: string; icon: string }>;
  } {
    return {
      items: [
        { title: "Dashboard", icon: "mdi-view-dashboard" },
        { title: "Photos", icon: "mdi-image" },
        { title: "About", icon: "mdi-help-box" },
      ],
    };
  },
  methods: {
    test() {
      let data = [];

      window.import.readPredictMatrix().then((matrix) => {
        for (const run in matrix.runs) {
          const items = matrix.runs[run].items;
          for (const item in items) {
            const trace = {
              x: [items[item][0]],
              y: [items[item][1]],
              mode: "markers",
              type: "scatter",
              name: run.substring(0, 10),
            } as Plotly.ScatterData;
            data.push(trace);
          }
        }
        var graphDiv = document.getElementById("test");
        if (graphDiv) {
          const layout = {
            title: "Sales Growth",
            xaxis: {
              title: "Year",
            },
            yaxis: {
              title: "Percent",
            },
            uirevision: "true",
          };
          console.log("data:", data);
          Plotly.newPlot(graphDiv, data, layout);
        }
      });
    },
  },
  mounted() {
    this.test();
  },
});
</script>
