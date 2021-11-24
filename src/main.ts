import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

// Styles
import "../node_modules/@mdi/font/css/materialdesignicons.min.css";
import "../public/main.scss";

import { PCATrace } from "./@types/preload";
import { Import } from './@types/import';
import { Normalize } from "./@types/graphConfigs";
import { session } from './@types/session';

declare global {
  interface Window {
    ipcRenderer: any;
    import: {
      createDataframe: (
        label: string,
        runs: Array<string>,
        dataFormat: "column" | "row"
      ) => Promise<string>;
    };
    store: {
      get: (key: any) => any;
      set: (key: any, value: any) => void;
    };
    session: {
      getSessions: () => Promise<JSON[]>;
      createSessionDir: (session: session) => Promise<void>;
      saveSessionFile: (session: session, fileName: string) => Promise<any>;
      deleteSession: (session: session) => Promise<void>;
      exportData: (session: session) => Promise<void>;
      readPredictMatrix: (session: session, dimensions: number, normalize_type: Normalize) => Promise<PCATrace[]>;
      readImportDataframe: (session: session, withClasses?: boolean, withDimensions?: boolean) => Promise<Import>;
      readDistanceMatrix: (session: session, matrix: number[][], classes: string[], normalize_type: Normalize) => Promise<number[][]>;
    };
    system: {
      getDirectory: (directory: string[]) => string;
      createFile: (fileName: string, data: any) => Promise<void>;
    };
    theme: {
      toggle: () => "system" | "light" | "dark";
      isDark: () => boolean
    };
    main: {
      listen: (channel: string, func: (event: any, ...arg: any) => void) => void;
    }
  }
}

Vue.config.productionTip = false;

export type VueExtensions = Vue & { [key: string]: any };

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
