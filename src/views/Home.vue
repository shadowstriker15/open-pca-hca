<template>
  <v-container class="home-container" style="height: 100%; width: 100%">
    <side-nav
      v-if="!isFullscreen"
      :selectedGraph.sync="selectedGraph"
      @graphChanged="updateGraph"
    ></side-nav>
    <div class="view-container" style="height: 100%; width: 100%">
      <v-row class="ma-0" style="height: 100%">
        <v-col :cols="showSettings ? 9 : 12" style="height: 100%">
          <v-sheet
            id="graph-container"
            class="graph-container"
            outlined
            width="100%"
            height="100%"
            style="padding: 10px"
          >
            <div class="flex-fixed">
              <graph-toolbar
                @fullscreen="updateFullscreen"
                @settings="toggleGraphSettings"
              ></graph-toolbar>
            </div>
            <div class="flex-fill" v-if="graphConfigs">
              <pca-2d
                v-if="selectedGraph == 'pca-2d-scatter'"
                :configs="graphConfigs[viewingGraph]"
              ></pca-2d>
              <pca-3d
                v-else-if="selectedGraph == 'pca-3d-scatter'"
                :configs="graphConfigs[viewingGraph]"
              ></pca-3d>
              <hca-dendrogram
                v-else-if="selectedGraph == 'hca-dendrogram'"
                :configs="graphConfigs[viewingGraph]"
              ></hca-dendrogram>
              <heatmap-wrapper
                v-else-if="selectedGraph == 'hca-heatmap'"
                style="height: 1800px"
                :type="heatmapType"
                :configs="graphConfigs[viewingGraph]"
              ></heatmap-wrapper>
            </div>
            <!-- TODO -->
            <!-- <div id="loader"></div> -->
          </v-sheet>
        </v-col>
        <v-col v-if="showSettings && !isFullscreen" cols="3">
          <graph-settings
            :graphType="viewingGraph"
            :graphConfigs.sync="graphConfigs"
            @heatmapType="updateHeatmapType"
          ></graph-settings>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<style scoped>
.view-container {
  /* padding: 1rem; */
}

.graph-container {
  display: flex;
  flex-direction: column;
  box-shadow: 0px 0px 5px 0 rgb(0 0 0 / 16%), 0px 0px 5px 0 rgb(0 0 0 / 16%);
  border-radius: 1rem;
  margin-left: auto;
  margin-right: auto;
}

#graph-container.fullscreen {
  position: absolute;
  box-shadow: none;
  border-radius: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.home-container {
  background: #f5f7fb;
}
</style>

<script lang="ts">
import Vue from "vue";
import SideNav from "../components/SideNav.vue";
import lottie from "lottie-web";

// Graph components
import PCA2D from "../components/graphs/PCA2D.vue";
import PCA3D from "../components/graphs/PCA3D.vue";
import HCADendrogram from "../components/graphs/HCADendrogram.vue";
import HeatmapWrapper from "../components/graphs/HeatmapWrapper.vue";

// Graph misc
import GraphToolbar from "../components/GraphToolbar.vue";
import GraphSettings from "../components/GraphSettings.vue";

// Types
import { GraphTypes, GraphViews } from "../@types/graphs";
import { Configs } from "../@types/graphConfigs";
import { DefaultConfigs } from "../defaultConfigs";

export default Vue.extend({
  name: "Home",
  data(): {
    selectedGraph: GraphViews;
    isFullscreen: boolean;
    showSettings: boolean;
    heatmapType: "default" | "distance";
  } {
    return {
      selectedGraph: "pca-2d-scatter",
      isFullscreen: false,
      showSettings: false,
      heatmapType: "default",
    };
  },
  components: {
    "side-nav": SideNav,
    "heatmap-wrapper": HeatmapWrapper,
    "pca-3d": PCA3D,
    "pca-2d": PCA2D,
    "hca-dendrogram": HCADendrogram,
    "graph-toolbar": GraphToolbar,
    "graph-settings": GraphSettings,
  },
  computed: {
    viewingGraph(): GraphTypes {
      if (this.selectedGraph == "hca-heatmap") {
        switch (this.heatmapType) {
          case "default": {
            return "hca-heatmap-default";
          }
          case "distance": {
            return "hca-heatmap-distance";
          }
          default: {
            throw Error(
              `Invalid heatmap type has been set: ${this.heatmapType}`
            );
          }
        }
      } else return this.selectedGraph;
    },
  },
  asyncComputed: {
    graphConfigs: {
      get(): Promise<Configs> {
        return this.getGraphConfigs();
      },
    },
  },
  methods: {
    renderAnimation() {
      let element = document.getElementById("loader");
      if (element) {
        lottie.loadAnimation({
          container: element,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: "graph-loader.json",
        });
      }
    },
    updateGraph(graph: GraphViews) {
      this.selectedGraph = graph;
    },
    updateFullscreen(val: boolean) {
      this.isFullscreen = val;
    },
    toggleGraphSettings(val: boolean) {
      this.showSettings = val;
    },
    async getGraphConfigs(): Promise<Configs> {
      const configs = await window.store.get("graphConfigs");
      if (configs) {
        // Fill any gaps with default configs
        return Object.assign({}, DefaultConfigs, configs);
      } else return DefaultConfigs;
    },
    updateHeatmapType(type: "default" | "distance") {
      this.heatmapType = type;
    },
    getSelectedGraph() {
      return localStorage.getItem("selected-graph")
        ? (localStorage.getItem("selected-graph") as GraphViews)
        : "pca-2d-scatter";
    },
  },
  mounted() {
    this.selectedGraph = this.getSelectedGraph();
    // this.renderAnimation(); TODO Maybe have a global, single loader that gets called by other graphs
  },
});
</script>