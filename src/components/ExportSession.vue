<template>
  <v-dialog v-model="exportDialog">
    <template v-slot:activator="{ on, attrs }">
      <v-list-item v-bind="attrs" v-on="on" @click="exportDialog = true">
        Export
      </v-list-item>
    </template>
    <v-card>
      <v-card-title>Select Directory</v-card-title>
      <v-card-actions>
        <v-btn color="gray" text @click="exportDialog = false"> Close </v-btn>
        <v-btn color="primary" text @click="exportData"> Export </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { session } from "@/@types/session";
import Vue from "vue";

export default Vue.extend({
  name: "ExportSession",
  data(): {
    exportDialog: boolean;
  } {
    return {
      exportDialog: false,
    };
  },
  methods: {
    exportData() {
      //TODO MAKE GLOBAL FUNCTION TO GET CURRENT SESSION
      let sessionStr = localStorage.getItem("session");
      if (sessionStr) {
        let session = JSON.parse(sessionStr) as session;
        window.session.exportData(session);
      }
    },
  },
});
</script>
