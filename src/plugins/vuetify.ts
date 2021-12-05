import Vue from "vue";
import Vuetify from "vuetify/lib/framework";

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    options: {
      customProperties: true,
    },
    themes: {
      light: {
        primary: "#8641dd",
        secondary: "#202124",
        accent: "#82B1FF",
        error: "#FF5252",
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FFC107",
        background: "#FFFFFF",
        noSessionAccent_1: "#F2F0F5",
        noSessionAccent_2: "#E5D9F7",
        noSessionAccent_3: "#D2B4FC"
      },
      dark: {
        primary: "#a86cf4",
        secondary: "#ffffff",
        background: "#121212",
        noSessionAccent_1: "#B9A0DE",
        noSessionAccent_2: "#5A4678",
        noSessionAccent_3: "#946AD0"
      },
    },
  },
});
