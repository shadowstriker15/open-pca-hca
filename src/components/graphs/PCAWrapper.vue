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
import { Graph } from "@/classes/graph";

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
    resizeObserver: ResizeObserver | null;
    plot: Plotly.PlotlyHTMLElement | null;
  } {
    return {
      isLoading: true,
      session: null,
      resizeObserver: null,
      plot: null,
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
    "$vuetify.theme.dark": function () {
      var graphDiv = document.getElementById("pcaGraph");
      if (graphDiv && !this.isLoading)
        Plotly.relayout(graphDiv, this.getLayout());
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
      var layout: any = {
        paper_bgcolor: "rgba(0,0,0,0)",
        font: {
          family: "Inter, sans-serif",
          color: this.$vuetify.theme.dark ? "#ffffff" : "rgb(68, 68, 68)",
        },
      };
      if (this.type == "pca-2d-scatter") {
        Object.assign(layout, {
          plot_bgcolor: "rgba(0,0,0,0)",
          autosize: true,
          title: {
            text: "<b>PCA 2D</b>",
            font: {
              size: 27,
            },
          },
          xaxis: {
            title: "PC1",
          },
          yaxis: {
            title: "PC2",
          },
        });
      } else if (this.type == "pca-3d-scatter") {
        Object.assign(layout, {
          title: {
            text: "<b>PCA 3D</b>",
            font: {
              size: 27,
            },
          },
          scene: {
            xaxis: { title: "PC1" },
            yaxis: { title: "PC2" },
            zaxis: { title: "PC3" },
          },
          uirevision: "true",
        });
      }
      return layout;
    },
    getData(session: session): Promise<void> {
      let data: Plotly.ScatterData[] = [];
      const dimensions = this.type == "pca-3d-scatter" ? 3 : 2;

      return new Promise<void>((resolve, reject) => {
        window.session
          .readPredictMatrix(session, dimensions, this.configs["normalize"])
          .then((traces) => {
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
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: [
                  "toImage",
                  "select2d",
                  "lasso2d",
                ] as Plotly.ModeBarDefaultButtons[],
              };

              this.resizeObserver && this.resizeObserver.unobserve(graphDiv);
              this.resizeObserver = new ResizeObserver(
                (entries: ResizeObserverEntry[]) => {
                  if (graphDiv) {
                    let display = window.getComputedStyle(graphDiv).display;
                    if (!display || display === "none") return;
                    Plotly.Plots.resize(graphDiv as Plotly.Root);
                  }
                }
              );

              return Plotly.newPlot(graphDiv, data, this.getLayout(), config)
                .then((gd) => {
                  this.plot = gd;
                  this.resizeObserver?.observe(gd);
                  this.isLoading = false;

                  resolve();
                })
                .catch((err) => {
                  console.error(`Failed to create ${this.type} graph`, err);
                  reject();
                });
            }
          })
          .catch((err) => {
            console.error("Failed to read from PCA predict file", err);
            reject();
          });
      });
    },
    screenshotRequested() {
      const graph = new Graph(this.type);

      if (this.plot) {
        Plotly.toImage(this.plot, {
          height: this.plot.offsetHeight,
          width: this.plot.offsetWidth,
          format: "svg",
        }).then((url) => {
          this.$emit("screenshotLink", url, graph.name);
        });
      }
    },
  },
  mounted() {
    this.session = new Session();
    this.createGraph();
  },
});
</script>
