import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";
import { PCATrace } from "./@types/preload";
import { Import } from './@types/import';

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
      ) => Promise<string>;
      readPredictMatrix: (dimensions?: number) => Promise<PCATrace[]>;
      readImportDataframe: (withClasses?: boolean, withDimensions?: boolean) => Promise<Import>;
    };
    store: {
      get: (key: any) => any;
      set: (key: any, value: any) => void;
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
