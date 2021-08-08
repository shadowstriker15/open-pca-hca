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
const data = {};
// const Data: PredictMatrix = {
//   runs: {
//     "Measurement1.csv": {
//       items: {
//         H2O: {
//           "0": 42.777404570658966,
//           "1": -14.356639238295962,
//         },
//         "Ni(II)": {
//           "0": -0.44573117502489795,
//           "1": -1.2076148470358326,
//         },
//         "Cu(II)": {
//           "0": -19.326268146280896,
//           "1": -16.60099387755059,
//         },
//         "Fe(II)": {
//           "0": 3.936170938114722,
//           "1": 37.54641516041116,
//         },
//         "Fe(III)": {
//           "0": -26.94157618746793,
//           "1": -5.381167197528816,
//         },
//       },
//     },
//     "Measurement2.csv": {
//       items: {
//         H2O: {
//           "0": 36.93321811982127,
//           "1": -26.80600797131438,
//         },
//         "Ni(II)": {
//           "0": -2.1476398021998606,
//           "1": -2.2778364997363933,
//         },
//         "Cu(II)": {
//           "0": -32.97326145298512,
//           "1": -7.3646152331598,
//         },
//         "Fe(II)": {
//           "0": 23.109238909880762,
//           "1": 34.366641561372795,
//         },
//         "Fe(III)": {
//           "0": -24.92155577451711,
//           "1": 2.0818181428377556,
//         },
//       },
//     },
//     "Measurement3.csv": {
//       items: {
//         H2O: {
//           "0": 41.77652779687628,
//           "1": -6.6961952380980865,
//         },
//         "Ni(II)": {
//           "0": 2.7880873495195138,
//           "1": -5.126041403181179,
//         },
//         "Cu(II)": {
//           "0": -8.952549611056389,
//           "1": -19.236451923052126,
//         },
//         "Fe(II)": {
//           "0": -3.9659477981163795,
//           "1": 39.90969943486694,
//         },
//         "Fe(III)": {
//           "0": -31.646117737223015,
//           "1": -8.851010870535566,
//         },
//       },
//     },
//     "Measurement4.csv": {
//       items: {
//         H2O: {
//           "0": 45.523781627302405,
//           "1": -17.506094047661733,
//         },
//         "Ni(II)": {
//           "0": 2.0227463720999843,
//           "1": -1.4655234447432959,
//         },
//         "Cu(II)": {
//           "0": -23.292622005387987,
//           "1": -16.11455721262118,
//         },
//         "Fe(II)": {
//           "0": 7.742442397189473,
//           "1": 38.933926617984234,
//         },
//         "Fe(III)": {
//           "0": -31.996348391203888,
//           "1": -3.8477519129579894,
//         },
//       },
//     },
//   },
// };

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
              name: run,
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
