<template>
  <v-container style="height: 100%; width: 100%">
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
                :showSettings="showSettings"
                @fullscreen="updateFullscreen"
                @settings="toggleGraphSettings"
                @requestScreenshot="handleScreenshotRequest"
              ></graph-toolbar>
            </div>
            <div class="flex-fill" v-if="graphConfigs">
              <pca-wrapper
                ref="pcaWrapper"
                v-if="
                  ['pca-2d-scatter', 'pca-3d-scatter'].includes(selectedGraph)
                "
                :type="selectedGraph"
                :configs="graphConfigs[viewingGraph]"
                @screenshotLink="updateScreenshotLink"
              >
              </pca-wrapper>
              <hca-dendrogram
                ref="hcaDendrogram"
                v-else-if="selectedGraph == 'hca-dendrogram'"
                :configs="graphConfigs[viewingGraph]"
                @screenshotLink="updateScreenshotLink"
              ></hca-dendrogram>
              <heatmap-wrapper
                ref="hcaHeatmap"
                v-else-if="selectedGraph == 'hca-heatmap'"
                style="height: 1800px"
                :type="heatmapType"
                :configs="graphConfigs[viewingGraph]"
                @screenshotLink="updateScreenshotLink"
              ></heatmap-wrapper>
            </div>
            <!-- TODO -->
            <!-- <div id="loader"></div> -->
          </v-sheet>
        </v-col>
        <v-col v-if="showSettings && !isFullscreen" cols="3">
          <graph-settings
            v-if="graphConfigs"
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
</style>

<script lang="ts">
import Vue from "vue";
import SideNav from "@/components/SideNav.vue";
// import lottie from "lottie-web";

// Graph components
import PCAWrapper from "@/components/graphs/PCAWrapper.vue";
import HCADendrogram from "@/components/graphs/HCADendrogram.vue";
import HeatmapWrapper from "@/components/graphs/HeatmapWrapper.vue";

// Graph misc
import GraphToolbar from "@/components/GraphToolbar.vue";
import GraphSettings from "@/components/GraphSettings.vue";

// Types
import { GraphTypes, GraphViews, HeatmapType } from "@/@types/graphs";
import { GraphsConfigs } from "@/@types/graphConfigs";
import { DefaultGraphConfigs } from "@/defaultConfigs";
import { ProgramSession } from "@/classes/programSession";
import { VueExtensions } from "@/main";

export default Vue.extend({
  name: "Home",
  data(): {
    selectedGraph: GraphViews;
    isFullscreen: boolean;
    showSettings: boolean;
    heatmapType: HeatmapType;
    session: ProgramSession | null;
  } {
    return {
      selectedGraph: "pca-2d-scatter",
      isFullscreen: false,
      showSettings: true,
      heatmapType: "default",
      session: null,
    };
  },
  components: {
    "side-nav": SideNav,
    "heatmap-wrapper": HeatmapWrapper,
    "pca-wrapper": PCAWrapper,
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
      get(): Promise<GraphsConfigs> {
        return this.getGraphConfigs();
      },
    },
  },
  methods: {
    //TODO
    // renderAnimation() {
    //   let element = document.getElementById("loader");
    //   if (element) {
    //     lottie.loadAnimation({
    //       container: element,
    //       renderer: "svg",
    //       loop: true,
    //       autoplay: true,
    //       path: "graph-loader.json",
    //     });
    //   }
    // },
    updateGraph(graph: GraphViews) {
      this.selectedGraph = graph;
    },
    updateFullscreen(val: boolean) {
      this.isFullscreen = val;
    },
    toggleGraphSettings(val: boolean) {
      window.store.set("showSettings", val);
      this.showSettings = val;
    },
    async getGraphConfigs(): Promise<GraphsConfigs> {
      const configs = await window.store.get("graphConfigs");
      if (configs) {
        // Fill any gaps with default configs
        return Object.assign({}, DefaultGraphConfigs, configs);
      } else return DefaultGraphConfigs;
    },
    updateHeatmapType(type: HeatmapType) {
      this.heatmapType = type;
    },
    getSelectedGraph() {
      return localStorage.getItem("selected-graph")
        ? (localStorage.getItem("selected-graph") as GraphViews)
        : "pca-2d-scatter";
    },
    updateScreenshotLink(link: string | null, type: GraphTypes) {
      if (link && link.length) {
        let anchor = document.createElement("a");
        anchor.href = link;
        anchor.download = type;
        anchor.click();
      }
    },
    handleScreenshotRequest() {
      let child = null;
      if (["pca-2d-scatter", "pca-3d-scatter"].includes(this.selectedGraph)) {
        child = this.$refs.pcaWrapper as VueExtensions;
      } else if (this.selectedGraph == "hca-dendrogram") {
        child = this.$refs.hcaDendrogram as VueExtensions;
      } else if (this.selectedGraph == "hca-heatmap") {
        child = this.$refs.hcaHeatmap as VueExtensions;
      }
      if (child) child.screenshotRequested();
    },
    updateCurrentSession() {
      if (this.session)
        window.system.createFile("current.json", this.session.session);
    },
    async getShowSettings(): Promise<void> {
      this.showSettings = await window.store.get("showSettings", true);
    },
  },
  mounted() {
    this.selectedGraph = this.getSelectedGraph();
    this.updateCurrentSession();
    this.getShowSettings();
    // this.renderAnimation(); TODO Maybe have a global, single loader that gets called by other graphs
  },
  created() {
    this.session = new ProgramSession();
    document.title = `${this.session.session.name} - Open PCA and HCA`;
  },
});
</script>