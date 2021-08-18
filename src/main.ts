import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";
import { PredictMatrix } from "./interfaces/Predict/Matrix";

// Styles
import "../node_modules/@mdi/font/css/materialdesignicons.min.css";
import "../public/main.scss";

declare global {
  interface Window {
    ipcRenderer: any;
    import: {
      createDataframe: (
        label: string,
        runs: Array<string>,
        dataFormat: "column" | "row"
      ) => void;
      readPredictMatrix: () => Promise<PredictMatrix>;
    };
    store: {
      get: (key: any) => any;
    };
    theme: {
      toggle: () => "system" | "light" | "dark";
      isDark: () => boolean
    };
  }
}

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
