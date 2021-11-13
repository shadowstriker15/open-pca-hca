<template>
  <div class="loader-container h-100 w-100">
    <loader v-if="isLoading"></loader>
    <div v-show="!isLoading" id="pcaGraph" class="graph-element"></div>
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
import Plotly from "plotly.js-dist-min";
import { Session } from "@/classes/session";
import { session } from "@/@types/session";
import { PCAGraphs } from "@/@types/graphs";

import Loader from "../Loader.vue";

export default Vue.extend({
  name: "PCAWrapper",
  props: {
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
    },
    type: {
      type: String as PropType<PCAGraphs>,
      required: false,
    },
  },
  data(): {
    isLoading: boolean;
    session: Session | null;
  } {
    return {
      isLoading: true,
      session: null,
    };
  },
  components: {
    loader: Loader,
  },
  watch: {
    configs: {
      deep: true,
      handler(val: GraphConfigs) {
        this.createGraph().then(() => {
          // Update session
          if (this.session) {
            this.session.session.predict_normalize = val.normalize; //TODO REWORD THIS
            this.session.updateSession();
          }
        });
      },
    },
  },
  methods: {
    createGraph() {
      this.isLoading = true;
      return new Promise((resolve, reject) => {
        if (this.session) {
          resolve(this.getData(this.session.session));
        }
        reject();
      });
    },
    getLayout() {
      if (this.type == "pca-2d-scatter") {
        return {
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
      } else if (this.type == "pca-3d-scatter") {
        return {
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
      }
    },
    getData(session: session): Promise<void> {
      let data: Plotly.ScatterData[] = [];
      const dimensions = this.type == "pca-3d-scatter" ? 3 : 2;

      return new Promise<void>(async (resolve, reject) => {
        try {
          const traces = await window.session.readPredictMatrix(
            session,
            dimensions,
            this.configs["normalize"]
          );
          for (let i = 0; i < traces.length; i++) {
            const pca_trace = traces[i];
            const trace = {
              mode: "markers",
              type: this.type == "pca-3d-scatter" ? "scatter3d" : "scatter",
              ...pca_trace,
            } as Plotly.ScatterData;

            data.push(trace);
          }

          var graphDiv = document.getElementById("pcaGraph");
          if (graphDiv) {
            const config = {
              responsive: true,
            };

            return Plotly.newPlot(graphDiv, data, this.getLayout(), config)
              .then(() => {
                this.isLoading = false;
                resolve();
              })
              .catch((err) => {
                console.error(`Failed to create ${this.type} graph`, err);
                reject();
              });
          }
        } catch (err_1) {
          console.error("Failed to read from PCA predict file", err_1);
          reject();
        }
      });
    },
  },
  mounted() {
    this.session = new Session();
    this.createGraph();
  },
});
</script>
