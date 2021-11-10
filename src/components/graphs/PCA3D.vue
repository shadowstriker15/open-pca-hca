<template>
  <div class="loader-container h-100 w-100">
    <loader v-if="isLoading"></loader>
    <div id="pca3DElement" class="graph-element"></div>
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
import { ScatterData, newPlot } from "plotly.js/dist/plotly.min";
import { Session } from "@/classes/session";
import { session } from "@/@types/session";

import Loader from "../Loader.vue";

export default Vue.extend({
  name: "PCA3D",
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

      //TODO NEED A GLOBAL APPROACH TO GET CURRENT SESSION
      let sessionStr = localStorage.getItem("session");
      let session = JSON.parse(sessionStr) as session;

      return new Promise((resolve, reject) => {
        window.session
          .readPredictMatrix(session, 3, this.configs["normalize"])
          .then((traces) => {
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
