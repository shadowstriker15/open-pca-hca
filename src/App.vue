<template>
  <v-app>
    <v-icon
      v-if="!['/', '/home'].includes($route.path)"
      large
      style="position: absolute; left: 7px; top: 7px; z-index: 999"
      @click="back"
    >
      mdi-chevron-left-circle
    </v-icon>
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
      <router-view @showAlert="showAlert" @hideAlert="alert.visible = false" />
      <tour v-if="$route.path == '/home'"></tour>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";

import Tour from "@/components/Tour.vue";
type Alert = "success" | "error";

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
  },
});
</script>
