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
import Vue, { PropType } from "vue";

import { GraphConfigs } from "../../@types/graphConfigs";
import Plotly, { Datum } from "plotly.js-dist-min";
import { ProgramSession } from "@/classes/programSession";
import { PCAGraphs } from "@/@types/graphs";

import Loader from "../Loader.vue";
import { Graph } from "@/classes/graph";
import { PCATrace } from "@/@types/import";

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
    session: ProgramSession | null;
    resizeObserver: ResizeObserver | null;
    plot: Plotly.PlotlyHTMLElement | null;
    savedConfig: GraphConfigs | null;
  } {
    return {
      isLoading: true,
      session: null,
      resizeObserver: null,
      plot: null,
      savedConfig: null,
    };
  },
  components: {
    loader: Loader,
  },
  watch: {
    configs: {
      deep: true,
      immediate: false,
      handler(val: GraphConfigs) {
        var recreateGraph = true;

        if (this.savedConfig && this.savedConfig.size != val.size) {
          // Just update marker size
          recreateGraph = false;
          let graphDiv = document.getElementById("pcaGraph");
          let update = {
            marker: { size: this.configs.size },
          };
          if (graphDiv) Plotly.restyle(graphDiv, update);
        }

        if (recreateGraph) this.initCreateGraph();
        this.savedConfig = Object.assign({}, val);
      },
    },
    type() {
      var graphDiv = document.getElementById("pcaGraph");
      if (graphDiv) {
        this.plot = null;
      }
      this.initCreateGraph();
    },
    "$vuetify.theme.dark": function () {
      var graphDiv = document.getElementById("pcaGraph");
      if (graphDiv && !this.isLoading)
        Plotly.relayout(graphDiv, this.getLayout());
    },
  },
  methods: {
    /**
     * Initiate graph creation by requesting worker process for predict matrix
     * @author: Austin Pearce
     */
    initCreateGraph(): void {
      this.isLoading = true;
      if (this.session) {
        const dimensions = this.type == "pca-3d-scatter" ? 3 : 2;
        // Request worker to read from predict file (handle response in App.vue)
        window.session.readPredictMatrix(
          this.session.session,
          dimensions,
          this.configs["normalize"]
        );
      }
    },
    /**
     * Get the graph's layout
     * @returns description
     * @author: Austin Pearce
     */
    getLayout(): any {
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
    /**
     * Create PCA graph from data returned from worker
     * @param traces The PCA traces to plot
     * @author: Austin Pearce
     */
    createGraph(traces: PCATrace[]): void {
      let data: Plotly.ScatterData[] = [];

      for (let i = 0; i < traces.length; i++) {
        const pca_trace = traces[i];
        const trace = {
          mode: "markers",
          type: this.type == "pca-3d-scatter" ? "scatter3d" : "scatter",
          marker: { size: this.configs.size },
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

        // Create resize observer to make the graph responsive
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
        this.createOrUpdatePlot(graphDiv, data, config);

        // Update session's predict normalization
        if (this.session) {
          this.session.session.predict_normalize = this.configs.normalize;
          this.session.updateSession();
        }
      }
    },
    /**
     * Either creates new plot or update's preexisting plot
     * @param graphDiv Div where the plot is rendered
     * @param data Data to be plotted
     * @param config Graph configuration
     * @returns Promise of plot creation
     * @author: Austin Pearce
     */
    createOrUpdatePlot(
      graphDiv: HTMLElement,
      data: Plotly.ScatterData[],
      config: any
    ): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (this.plot) {
          // Update plot
          var update: { x: Datum[][]; y: Datum[][]; z: Datum[][] } = {
            x: [],
            y: [],
            z: [],
          };
          data.forEach((trace) => {
            update.x.push(trace.x as Datum[]);
            update.y.push(trace.y as Datum[]);
            update.z.push(trace.y as Datum[]);
          });

          Plotly.restyle(graphDiv, update, this.getLayout())
            .then((gd) => {
              this.plot = gd;
              this.resizeObserver?.observe(gd);
              this.isLoading = false;
              resolve();
            })
            .catch((err) => {
              console.error(`Failed to update ${this.type} graph`, err);
              reject();
            });
        } else {
          // Create plot
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
      });
    },
    /**
     * Handle screenshot request
     * @author: Austin Pearce
     */
    screenshotRequested(): void {
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
    this.session = new ProgramSession();
    this.initCreateGraph();
  },
});
</script>
