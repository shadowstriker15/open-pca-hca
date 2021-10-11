<template>
  <v-container style="height: 100%; width: 100%">
    <side-nav @graphChanged="updateGraph"></side-nav>
    <div style="height: 100%; width: 100%">
      <!-- <div style="background-color: red; height: 100%">Hi</div> -->
      <!-- <v-card class="overflow-hidden" style="height: 100%"> </v-card> -->
      <v-sheet
        v-if="['pca-2d-scatter', 'pca-3d-scatter'].includes(selectedGraph)"
        class="graph-container"
        outlined
        width="90%"
        height="100%"
        style="padding: 10px"
      >
        <PCA2D v-if="selectedGraph == 'pca-2d-scatter'"></PCA2D>
        <PCA3D v-else-if="selectedGraph == 'pca-3d-scatter'"></PCA3D>
        <!-- <div id="loader"></div> -->
        <!-- <Dendrogram></Dendrogram> -->
      </v-sheet>
      <v-sheet
        v-else-if="selectedGraph == 'hca-heatmap'"
        class="graph-container"
        outlined
        width="90%"
        height="1800px"
        style="padding: 10px"
      >
        <heatmap-wrapper style="height: 100%"></heatmap-wrapper>
      </v-sheet>
      <div>
        <!-- TODO -->
        <a href="/">GO Back</a>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.graph-container {
  box-shadow: 0px 0px 5px 0 rgb(0 0 0 / 16%), 0px 0px 5px 0 rgb(0 0 0 / 16%);
  border-radius: 1rem;
  margin-left: auto;
  margin-right: auto;
}
</style>

<script lang="ts">
import Vue from "vue";
import SideNav from "../components/SideNav.vue";
import PCA2D from "../components/graphs/PCA2D.vue";
import PCA3D from "../components/graphs/PCA3D.vue";
// import Dendrogram from "../components/graphs/Dendrogram.vue";
import lottie from "lottie-web";
import HeatmapWrapper from "../components/graphs/HeatmapWrapper.vue";
import { Graphs } from "../@types/graphs";

export default Vue.extend({
  components: { SideNav, HeatmapWrapper, PCA3D, PCA2D },
  name: "Home",
  data(): {
    selectedGraph: Graphs;
  } {
    return {
      selectedGraph: "pca-2d-scatter",
    };
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
    updateGraph(graph: Graphs) {
      this.selectedGraph = graph;
    },
  },
  mounted() {
    // this.renderAnimation(); TODO
  },
});
</script>