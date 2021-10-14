<template>
  <div id="pca3DElement" class="graph-element"></div>
</template>

<style scoped>
.graph-element {
  height: 100%;
  width: 100%;
}
</style>

<script lang="ts">
import Vue from "vue";
import { ScatterData, newPlot } from "plotly.js/dist/plotly.min";

export default Vue.extend({
  name: "PCA3D",
  methods: {
    test() {
      let data: Array<ScatterData> = [];

      window.import.readPredictMatrix(3).then((traces) => {
        for (let i = 0; i < traces.length; i++) {
          const pca_trace = traces[i];
          const trace = {
            mode: "markers",
            type: "scatter3d",
            ...pca_trace,
          } as ScatterData;

          data.push(trace);
        }

        var graphDiv = document.getElementById("pca3DElement");
        if (graphDiv) {
          const layout = {
            title: {
              text: "<b>PCA 3D</b>",
              font: {
                family: "Inter, sans-serif",
                size: 27,
                // color: "#7f7f7f",
              },
            },
            scene: {
              xaxis: { title: "PC1" },
              yaxis: { title: "PC2" },
              zaxis: { title: "PC3" },
            },
            uirevision: "true",
          };
          console.log("data:", data);
          const config = {
            responsive: true,
          };

          newPlot(graphDiv, data, layout, config).then((plot) => {
            console.log("Done loading PCA 3D graph");
          });
        }
      });
    },
  },
  mounted() {
    this.test();
  },
});
</script>
