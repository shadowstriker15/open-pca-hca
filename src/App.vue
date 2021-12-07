<template>
  <v-app>
    <v-row
      v-if="$route.path != '/home'"
      style="
        position: absolute;
        display: flex;
        justify-content: space-between;
        left: 20px;
        right: 20px;
        top: 7px;
        z-index: 999;
      "
    >
      <v-icon
        v-if="!['/', '/home'].includes($route.path)"
        large
        @click="back"
        style="margin-top: auto; margin-bottom: auto"
      >
        mdi-chevron-left-circle
      </v-icon>
      <!-- Span used for spacing -->
      <span v-else> </span>
      <v-list width="5rem">
        <theme-toggler></theme-toggler>
      </v-list>
    </v-row>

    <v-alert
      v-model="alert.visible"
      id="custom-alert"
      colored-border
      :icon="alertIcons[alert.type]"
      transition="scale-transition"
      dismissible
    >
      <div v-html="alert.text"></div>
    </v-alert>
    <v-main :class="this.$route.path == '/home' ? 'home-bg' : ''">
      <router-view
        ref="routerView"
        @showAlert="showAlert"
        @hideAlert="alert.visible = false"
      />
      <tour v-if="$route.path == '/home'"></tour>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";

import Tour from "@/components/Tour.vue";
import ThemeToggler from "./components/ThemeToggler.vue";
import { VueExtensions } from "./main";
type Alert = "success" | "error";
type VueComponent = VueExtensions | undefined;

export default Vue.extend({
  name: "App",

  data(): {
    alert: {
      visible: boolean;
      type: Alert;
      text: string;
    };
    alertIcons: {
      [key: string]: string;
    };
  } {
    return {
      alert: {
        visible: false,
        type: "success",
        text: "",
      },
      alertIcons: {
        success: "mdi-check-circle",
        error: "mdi-alert-circle",
      },
    };
  },
  components: {
    tour: Tour,
    "theme-toggler": ThemeToggler,
  },
  methods: {
    async updateTheme() {
      this.$vuetify.theme.dark = await window.theme.isDark();
    },
    back() {
      window.history.length >= 2 ? this.$router.go(-1) : this.$router.push("/");
    },
    showAlert(type: Alert, text: string, duration: number | null = 5000) {
      if (!duration) duration = 5000;

      this.alert.type = type;
      this.alert.text = text;
      this.alert.visible = true;
      if (duration > 0) {
        setTimeout(() => {
          this.alert.visible = false;
        }, duration);
      }
    },
  },
  mounted() {
    this.updateTheme();
  },
  created() {
    // Listens for the main process to request to change page
    window.main.listen("changeRouteTo", (event, path) => {
      if (this.$route.path != path) this.$router.push(path);
    });

    window.main.listen("showAlert", (event, type, text, duration = null) => {
      this.showAlert(type, text, duration);
    });

    window.main.listen("worker-response", (event, arg) => {
      let command = arg.command;
      let payload = arg.payload;

      console.log(`Heard from worker with command '${command}'`);
      const routerView = this.$refs.routerView as VueComponent;
      switch (command) {
        case "readPredictMatrix": {
          // Create PCA graph using data received from worker window
          if (routerView) {
            const pcaWrapper = routerView.$refs.pcaWrapper as VueComponent;
            pcaWrapper?.createGraph(payload.traces);
          }
          break;
        }
        case "readDistanceMatrix": {
          if (routerView) {
            const hcaDendrogram = routerView.$refs
              .hcaDendrogram as VueComponent;
            const hcaHeatmap = routerView.$refs.hcaHeatmap as VueComponent;

            if (hcaDendrogram) {
              hcaDendrogram.handleDistanceMatrix(payload.matrix);
            } else if (hcaHeatmap) {
              hcaHeatmap.handleDistanceMatrix(payload.matrix);
            }
          }
          break;
        }
        case "readImportDataframe": {
          if (routerView) {
            const hcaDendrogram = routerView.$refs
              .hcaDendrogram as VueComponent;
            const hcaHeatmap = routerView.$refs.hcaHeatmap as VueComponent;

            if (hcaDendrogram) {
              hcaDendrogram.handleImportDataframe(payload.importObj);
            } else if (hcaHeatmap) {
              hcaHeatmap.handleImportDataframe(payload.importObj);
            }
          }
          break;
        }
        default:
          console.warn(`Unknown command '${command}' response from worker`);
          break;
      }
    });
  },
});
</script>
