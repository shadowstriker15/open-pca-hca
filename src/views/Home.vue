<template>
  <v-container style="height: 100%; width: 100%">
    <side-nav></side-nav>
    <div class="test" style="height: 100%; width: 100%">
      <!-- <div style="background-color: red; height: 100%">Hi</div> -->
      <!-- <v-card class="overflow-hidden" style="height: 100%"> </v-card> -->
      <v-sheet
        class="graph-container"
        outlined
        :width="'90%'"
        :height="'90%'"
        style="padding: 20px"
      >
        <PCA2D></PCA2D>
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
  box-shadow: inset 0px 0px 5px 5px rgba(0, 0, 0, 0.3);
  border-radius: 1.5rem;
  margin-left: auto;
  margin-right: auto;
}
</style>

<script lang="ts">
import Vue from "vue";
import SideNav from "../components/SideNav.vue";
import PCA2D from "../components/graphs/PCA2D.vue";

export default Vue.extend({
  components: { SideNav, PCA2D },
  name: "Home",
});
</script>