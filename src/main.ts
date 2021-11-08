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
import { Normalize } from "./@types/graphConfigs";

declare global {
  interface Window {
    ipcRenderer: any;
    import: {
      createDataframe: (
        label: string,
        runs: Array<string>,
        dataFormat: "column" | "row"
      ) => Promise<string>;
      readPredictMatrix: (dimensions: number, normalize_type: Normalize) => Promise<PCATrace[]>;
      readImportDataframe: (withClasses?: boolean, withDimensions?: boolean) => Promise<Import>;
    };
    store: {
      get: (key: any) => any;
      set: (key: any, value: any) => void;
      getDirectory: (directory: string[]) => string;
    };
    session: {
      createSessionDir: (session: string) => Promise<void>;
      saveSessionFile: (sessionObj: any, fileName: string) => Promise<any>;
      getSessions: () => Promise<JSON[]>;
      deleteSession: (session: string) => Promise<void>;
      exportData: (session: string) => void;
    }
    theme: {
      toggle: () => "system" | "light" | "dark";
      isDark: () => boolean
    };
    main: {
      changeRoute: (channel: string, func: (event: any, ...arg: any) => void) => void;
    }
  }
}

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
