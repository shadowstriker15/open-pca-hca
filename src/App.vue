<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { PredictMatrix } from "./interfaces/Predict/Matrix";
declare global {
  interface Window {
    ipcRenderer: any;
    import: {
      createDataframe: (label: string, runs: Array<string>) => void;
      readPredictMatrix: () => Promise<PredictMatrix>;
    };
  }
}
import Vue from "vue";

export default Vue.extend({
  name: "App",

  data: () => ({
    //
  }),
});
</script>
