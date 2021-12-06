<template>
  <v-container class="h-100">
    <!-- TODO PUT LOADER UNTIL WE HAVE SESSIONS -->
    <v-col>
      <v-row class="ma-3" style="justify-content: center">
        <img
          v-if="sessions.length"
          draggable="false"
          style="width: 5rem"
          src="@/assets/logos/logo.svg"
        />
      </v-row>
      <div style="padding: 2rem">
        <v-row v-if="sessions.length" style="justify-content: space-between">
          <h2 class="mb-2">Sessions</h2>
          <v-btn class="ma-1" @click="toggleEdit" plain>
            {{ isEditing ? "Cancel" : "Edit" }}
          </v-btn>
        </v-row>
        <v-row class="session-container">
          <v-col v-if="sessions.length">
            <v-row
              @click="!isEditing ? selectSession(session) : ''"
              style="justify-content: space-between"
              :class="['session-btn accent-btn', !isEditing ? 'clickable' : '']"
              v-for="session in sessions"
              :key="session.created_date"
            >
              <v-col cols="10">
                <p>{{ session.name }}</p>
                <p>{{ session.created_date }}</p>
              </v-col>
              <!-- Delete dialog -->
              <v-dialog v-if="isEditing" persistent max-width="290">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    small
                    fab
                    v-bind="attrs"
                    v-on="on"
                    color="var(--v-error-base)"
                  >
                    <v-icon color="white"> mdi-trash-can </v-icon>
                  </v-btn>
                </template>
                <template v-slot:default="dialog">
                  <v-card>
                    <v-card-title class="text-h5">
                      Delete session?
                    </v-card-title>
                    <v-card-text
                      >Do you really want to delete session
                      <strong>{{ session.name }}</strong
                      >?</v-card-text
                    >
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="gray" text @click="dialog.value = false">
                        Cancel
                      </v-btn>
                      <v-btn
                        color="green darken-1"
                        text
                        @click="deleteSession(session)"
                      >
                        Confirm
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
              </v-dialog>
              <!-- /Delete dialog -->
            </v-row>
          </v-col>
          <v-col v-show="!sessions.length" class="text-center">
            <h3>No sessions</h3>
            <!-- No session svg -->
            <svg
              style="height: 15rem; width: auto"
              viewBox="0 0 269.5 210.45"
              clip-rule="evenodd"
              fill-rule="evenodd"
              image-rendering="optimizeQuality"
              shape-rendering="geometricPrecision"
              text-rendering="geometricPrecision"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m177.76 184.14a89.877 145.43 61.408 01-170.71-9.3158 89.877 145.43 61.408 0184.686-148.52 89.877 145.43 61.408 01170.71 9.3158 89.877 145.43 61.408 01-84.686 148.52z"
                fill="var(--v-noSessionAccent_2-base)"
                stroke-width=".36163"
              />
              <g
                clip-rule="evenodd"
                fill-rule="evenodd"
                shape-rendering="geometricPrecision"
                stroke-width=".36163"
              >
                <path
                  d="m207.94 50.733v18.443c-40.644-.17864-81.266.002-121.87.54245-1.1452.66287-2.0493 1.567-2.7122 2.7122-9.2813 29.168-18.563 58.339-27.846 87.515-.17988.95688-.24016 1.9214-.18081 2.8931.85418 2.5419 2.5418 4.2293 5.0629 5.0629-3.2711.28135-5.6216-1.0448-7.0518-3.978-.18082-39.176-.24109-78.355-.18082-117.53 2.163-3.5968 4.5135-7.0927 7.0518-10.487.9788-.88105 2.124-1.4235 3.4355-1.6274 24.109-.2411 48.217-.2411 72.327 0 1.435.34872 2.5802 1.1322 3.4355 2.3506.8379 2.2538 1.5612 4.5443 2.1698 6.871.81874 1.0607 1.8436 1.8443 3.0739 2.3506 19.649.12043 39.299.24121 58.946.36163 2.027 1.0014 3.4735 2.5083 4.3396 4.5204z"
                  fill="var(--v-noSessionAccent_3-base)"
                  image-rendering="optimizeQuality"
                  opacity=".999"
                />
                <path
                  d="m207.94 69.176c8.3183-.06039 16.636 0 24.953.18082 3.0439 1.3214 4.37 3.672 3.978 7.0518-.82562-2.211-2.3926-3.5972-4.7012-4.1588-48.459-.24121-96.918-.24121-145.38 0-1.8916.80717-3.1573 2.1933-3.7971 4.1588-9.0604 28.927-18.282 57.738-27.665 86.43-.05935-.97171.00094-1.9362.18081-2.8931 9.2828-29.176 18.564-58.346 27.846-87.515.66298-1.1453 1.5671-2.0494 2.7122-2.7122 40.604-.54028 81.226-.7211 121.87-.54245z"
                  fill="var(--v-noSessionAccent_1-base)"
                  image-rendering="optimizeQuality"
                />
                <path
                  d="m236.87 76.409c-9.183 29.177-18.405 58.349-27.665 87.515-.84332 2.0483-2.3502 3.314-4.5204 3.7972-48.097.18082-96.194.24121-144.29.18082-2.5211-.83357-4.2087-2.521-5.0629-5.0629 9.3829-28.693 18.605-57.503 27.665-86.43.63988-1.9655 1.9056-3.3516 3.7971-4.1588 48.459-.24121 96.918-.24121 145.38 0 2.3087.56162 3.8756 1.9478 4.7012 4.1588z"
                  fill="var(--v-noSessionAccent_1-base)"
                  image-rendering="optimizeQuality"
                  opacity=".999"
                />
              </g>
            </svg>
            <p>There are no available sessions to view</p>
          </v-col>
        </v-row>
        <v-row class="mt-5">
          <div
            @click="createSession"
            class="create-session-btn accent-btn clickable"
          >
            <v-icon style="flex: auto; justify-content: left" large>
              mdi-plus-circle
            </v-icon>
            <span class="btn-text">New session</span>
          </div>
        </v-row>
      </div>
    </v-col>
  </v-container>
</template>

<style scoped>
.session-btn {
  padding: 1rem;
  height: 7rem;
  margin-bottom: 1rem;
}

.session-container {
  max-height: 21.5rem;
  margin-right: -2rem;
  padding-right: 1rem;
  overflow: auto;
}

.create-session-btn {
  margin-left: auto;
  max-width: 11rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
}

.create-session-btn > .btn-text {
  flex: auto;
  justify-content: center;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}
</style>

<script lang="ts">
import { ProgramSession } from "@/classes/programSession";
import Vue from "vue";
import { session } from "../../@types/session";

export default Vue.extend({
  name: "Selection",
  data(): {
    sessions: session[];
    isEditing: boolean;
  } {
    return {
      sessions: [],
      isEditing: false,
    };
  },
  watch: {
    sessions(val) {
      if (!val.length) this.isEditing = false;
    },
  },
  methods: {
    getSessions() {
      window.session.getSessions().then((response) => {
        //TODO TRY REJECT AND SEE IF THEN IS STILL CALLED
        this.sessions = response.map((obj) => obj as unknown as session);
      });
    },
    createSession() {
      this.$router.push("/session/create");
    },
    selectSession(session: session) {
      localStorage.setItem("currentSession", JSON.stringify(session));
      this.$router.push("/home");
    },
    toggleEdit() {
      this.isEditing = !this.isEditing;
    },
    deleteSession(session: session) {
      const sessionInstance = new ProgramSession(session);
      sessionInstance.deleteSession().then(() => {
        this.sessions = this.sessions.filter((obj) => obj.name != session.name);
        this.$emit(
          "showAlert",
          "success",
          `Session <strong>${session.name}</strong> was successfully deleted`,
          3000
        );
      });
    },
  },
  mounted() {
    this.getSessions();
  },
  created() {
    document.title = "Open PCA and HCA";
  },
});
</script>
