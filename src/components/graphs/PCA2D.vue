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
import { PropType } from "vue";
import { GraphConfigs } from "../../@types/graphConfigs";
import { ScatterData, newPlot } from "plotly.js/lib/core";
import { Session } from "@/classes/session";
import { session } from "@/@types/session";

export default Vue.extend({
  name: "PCA2D",
  props: {
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
    },
  },
  watch: {
    configs: {
      deep: true,
      handler(val: GraphConfigs) {
        let sessionStr = localStorage.getItem("session");
        if (sessionStr) {
          const sessionObj = JSON.parse(sessionStr) as session;
          sessionObj.predict_normalize = val.normalize;
          let session = new Session(sessionObj);

          this.createGraph().then(() => {
            // Update session
            session.updateSession();
          });
        }
      },
    },
  },
  methods: {
    createGraph() {
      let data: ScatterData[] = [];
      let configs = this.configs;

      return new Promise(function (resolve, reject) {
        window.import
          .readPredictMatrix(2, configs["normalize"])
          .then((traces) => {
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
                resolve();
              });
            }
          });
      });
    },
  },
  mounted() {
    this.createGraph();
  },
});
</script>
