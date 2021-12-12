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
                :type="heatmapType"
                :configs="graphConfigs[viewingGraph]"
                @screenshotLink="updateScreenshotLink"
              ></heatmap-wrapper>
            </div>
          </v-sheet>
        </v-col>
        <v-col v-if="showSettings && !isFullscreen" cols="3">
          <graph-settings
            v-if="graphConfigs && session"
            :session="session.session"
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
import { VueComponent } from "@/main";

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
    /**
     * Update the currently selected graph
     * @author: Austin Pearce
     */
    updateGraph(graph: GraphViews): void {
      this.selectedGraph = graph;
    },
    /**
     * Update fullscreen status
     * @author: Austin Pearce
     */
    updateFullscreen(val: boolean): void {
      this.isFullscreen = val;
    },
    /**
     * Toggle graph panel visibility
     * @author: Austin Pearce
     */
    toggleGraphSettings(val: boolean): void {
      window.store.set("showSettings", val);
      this.showSettings = val;
    },
    /**
     * Get graph configurations for current session
     * @returns Promise of graph configurations
     * @author: Austin Pearce
     */
    async getGraphConfigs(): Promise<GraphsConfigs> {
      if (this.session) {
        const configs = await window.session.getInfo(
          this.session.session,
          "graphConfigs"
        );
        if (configs) {
          // Fill any gaps with default configs
          return Object.assign({}, DefaultGraphConfigs, configs);
        }
      }
      return DefaultGraphConfigs;
    },
    /**
     * Update the viewing heatmap type
     * @author: Austin Pearce
     */
    updateHeatmapType(type: HeatmapType) {
      this.heatmapType = type;
    },
    /**
     * Read last selected graph from localStorage
     * @returns Graph to currently show
     * @author: Austin Pearce
     */
    getSelectedGraph(): GraphViews {
      return localStorage.getItem("selected-graph")
        ? (localStorage.getItem("selected-graph") as GraphViews)
        : "pca-2d-scatter";
    },
    /**
     * Initiate download of graph screenshot
     * @param link The link of the graph to download
     * @param type The type of graph to be downloaded
     * @author: Austin Pearce
     */
    updateScreenshotLink(link: string | null, type: GraphTypes): void {
      if (link && link.length) {
        let anchor = document.createElement("a");
        anchor.href = link;
        anchor.download = type;
        anchor.click();
      }
    },
    /**
     * Relay screenshot request to respectable graph component
     * @author: Austin Pearce
     */
    handleScreenshotRequest() {
      let child = null;
      if (["pca-2d-scatter", "pca-3d-scatter"].includes(this.selectedGraph)) {
        child = this.$refs.pcaWrapper as VueComponent;
      } else if (this.selectedGraph == "hca-dendrogram") {
        child = this.$refs.hcaDendrogram as VueComponent;
      } else if (this.selectedGraph == "hca-heatmap") {
        child = this.$refs.hcaHeatmap as VueComponent;
      }
      if (child) child.screenshotRequested();
    },
    /**
     * Update the current session
     * @author: Austin Pearce
     */
    updateCurrentSession(): void {
      if (this.session)
        window.system.createFile("current.json", this.session.session);
    },
    /**
     * Determine to show settings panel or not
     * @author: Austin Pearce
     */
    async getShowSettings(): Promise<void> {
      this.showSettings = await window.store.get("showSettings", true);
    },
  },
  mounted() {
    this.selectedGraph = this.getSelectedGraph();
    this.updateCurrentSession();
    this.getShowSettings();
  },
  created() {
    this.session = new ProgramSession();
    document.title = `${this.session.session.name} - Open PCA and HCA`;
  },
});
</script>