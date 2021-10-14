<template>
  <div id="pca2DElement" class="graph-element"></div>
</template>

<style scoped>
.graph-element {
  height: 100%;
  width: 100%;
}
</style>

<script lang="ts">
import Vue from "vue";
import { ScatterData, newPlot } from "plotly.js/lib/core";

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
    createGraph() {
      let data: ScatterData[] = [];

      window.import.readPredictMatrix().then((traces) => {
        for (let i = 0; i < traces.length; i++) {
          const pca_trace = traces[i];
          const trace = {
            mode: "markers",
            type: "scatter",
            ...pca_trace,
          } as ScatterData;

          data.push(trace);
        }

        var graphDiv = document.getElementById("pca2DElement");
        if (graphDiv) {
          const layout = {
            autosize: true,
            title: {
              text: "<b>PCA 2D</b>",
              font: {
                family: "Inter, sans-serif",
                size: 27,
                // color: "#7f7f7f",
              },
            },
            xaxis: {
              title: "PC1",
              font: {
                family: "Inter, sans-serif",
              },
            },
            yaxis: {
              title: "PC2",
              font: {
                family: "Inter, sans-serif",
              },
            },
          };
          console.log("data:", data);
          const config = {
            responsive: true,
          };

          newPlot(graphDiv, data, layout, config).then((plot) => {
            console.log("Done loading PCA 2D graph");
          });
        }
      });
    },
  },
  mounted() {
    this.createGraph();
  },
});
</script>
