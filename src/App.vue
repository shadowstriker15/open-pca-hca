<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts">
declare global {
  interface Window {
    ipcRenderer: any;
    import: {
      createDataframe: (label: string, runs: Array<string>) => void;
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
