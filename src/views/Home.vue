<template>
  <v-container style="height: 100%; width: 100%">
    <side-nav></side-nav>
    <div class="test" style="height: 100%; width: 100%">
      <!-- <div style="background-color: red; height: 100%">Hi</div> -->
      <!-- <v-card class="overflow-hidden" style="height: 100%"> </v-card> -->
      <v-sheet
        class="graph-container"
        outlined
        width="90%"
        height="1800px"
        style="padding: 10px"
      >
        <!-- <PCA2D></PCA2D> -->
        <show-heatmap style="height: 100%"></show-heatmap>
        <!-- <PCA3D></PCA3D> -->
        <!-- <div id="loader"></div> -->
        <!-- <Dendrogram></Dendrogram> -->
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
  border-radius: 1.5rem;
  margin-left: auto;
  margin-right: auto;
}
</style>

<script lang="ts">
import Vue from "vue";
import SideNav from "../components/SideNav.vue";
// import PCA2D from "../components/graphs/PCA2D.vue";
// import PCA3D from "../components/graphs/PCA3D.vue";
// import Dendrogram from "../components/graphs/Dendrogram.vue";
import lottie from "lottie-web";
import ShowHeatmap from "../components/graphs/ShowHeatmap.vue";

export default Vue.extend({
  components: { SideNav, ShowHeatmap },
  name: "Home",
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
  },
  mounted() {
    this.renderAnimation();
  },
});
</script>