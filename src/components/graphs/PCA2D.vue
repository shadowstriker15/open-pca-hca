<template>
  <div class="loader-container h-100 w-100">
    <loader v-if="isLoading"></loader>
    <div id="pca2DElement" class="graph-element"></div>
  </div>
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

import Loader from "../Loader.vue";

export default Vue.extend({
  name: "PCA2D",
  props: {
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
    },
  },
  data(): {
    isLoading: boolean;
  } {
    return {
      isLoading: true,
    };
  },
  components: {
    loader: Loader,
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
      this.isLoading = true;
      let data: ScatterData[] = [];

      let sessionStr = localStorage.getItem("session");
      let session = JSON.parse(sessionStr) as session;

      return new Promise((resolve, reject) => {
        window.session
          .readPredictMatrix(session, 2, this.configs["normalize"])
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
                this.isLoading = false;
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
