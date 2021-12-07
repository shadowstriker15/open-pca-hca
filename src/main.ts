import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

// Styles
import "../node_modules/@mdi/font/css/materialdesignicons.min.css";
import "../public/main.scss";

import { PCATrace } from "./@types/import";
import { Normalize } from "./@types/graphConfigs";
import { session } from './@types/session';

declare global {
  interface Window {
    ipcRenderer: any;
    import: {
      createDataframe: (
        session: session,
        label: string,
        runs: Array<string>,
        dataFormat: "column" | "row"
      ) => Promise<session>;
    };
    store: {
      get: (key: any, defaultVal?: any) => Promise<any>;
      set: (key: any, value: any) => Promise<void>;
      delete: (key: any) => Promise<void>;
    };
    session: {
      getSessions: () => Promise<JSON[]>;
      createSessionDir: (session: session) => Promise<void>;
      saveInfo: (session: session, key: string, value: any) => Promise<any>;
      getInfo: (session: session, key: string) => Promise<any | null>;
      deleteSession: (session: session) => Promise<void>;
      exportData: (session: session) => Promise<void>;
      readPredictMatrix: (session: session, dimensions: number, normalize_type: Normalize) => Promise<PCATrace[]>;
      readImportDataframe: (session: session, withClasses?: boolean, withDimensions?: boolean) => Promise<void>;
      readDistanceMatrix: (session: session, matrix: number[][], classes: string[], normalize_type: Normalize) => Promise<void>;
    };
    system: {
      getDirectory: (directory: string[]) => Promise<string>;
      createFile: (fileName: string, data: any) => Promise<void>;
    };
    theme: {
      toggle: () => Promise<Theme>;
      isDark: () => Promise<boolean>
    };
    main: {
      listen: (channel: string, func: (event: any, ...arg: any) => void) => void;
    }
  }
}

Vue.config.productionTip = false;

export type VueExtensions = Vue & { [key: string]: any };
export type Theme = "system" | "light" | "dark";

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
