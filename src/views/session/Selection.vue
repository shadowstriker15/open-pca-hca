<template>
  <v-container class="h-100">
    <v-col>
      <v-row class="ma-3" style="justify-content: center">
        <img
          draggable="false"
          style="width: 5rem"
          src="@/assets/logos/logo.svg"
        />
      </v-row>
      <div style="padding: 3rem">
        <v-row style="justify-content: space-between">
          <h2 class="mb-2">Sessions</h2>
          <v-btn class="ma-1" @click="toggleEdit" plain>
            {{ isEditing ? "Cancel" : "Edit" }}
          </v-btn>
        </v-row>
        <v-row>
          <v-col>
            <v-row
              @click="!isEditing ? selectSession(session) : ''"
              style="justify-content: space-between"
              :class="[
                'session-container accent-btn',
                !isEditing ? 'clickable' : '',
              ]"
              v-for="session in sessions"
              :key="session.created_date"
            >
              <v-col cols="10">
                <p>{{ session.name }}</p>
                <p>{{ session.created_date }}</p>
              </v-col>
              <!-- Delete dialog -->
              <v-dialog
                v-if="isEditing"
                v-model="dialog"
                persistent
                max-width="290"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-btn fab v-bind="attrs" v-on="on" color="#F93154">
                    <v-icon large color="white"> mdi-trash-can </v-icon>
                  </v-btn>
                </template>
                <v-card>
                  <v-card-title class="text-h5"> Delete session? </v-card-title>
                  <v-card-text
                    >Do you really want to delete session
                    {{ session.name }}?</v-card-text
                  >
                  <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="gray" text @click="dialog = false">
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
              </v-dialog>
              <!-- /Delete dialog -->
            </v-row>
          </v-col>
        </v-row>
        <v-row>
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
.session-container {
  padding: 1rem;
  height: 7rem;
  margin-bottom: 1rem;
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
import { log } from "console";
import Vue from "vue";
import { session } from "../../@types/session";

export default Vue.extend({
  name: "Selection",
  data(): {
    sessions: session[];
    isEditing: boolean;
    dialog: boolean;
  } {
    return {
      sessions: [],
      isEditing: false,
      dialog: false,
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
      localStorage.setItem("session", JSON.stringify(session));
      this.$router.push("/home");
    },
    toggleEdit() {
      this.isEditing = !this.isEditing;
    },
    deleteSession(session: session) {
      this.dialog = false;
      window.session.deleteSession(session.name).then(() => {
        this.sessions = this.sessions.filter(
          (obj) => obj.created_date != session.created_date
        );
      });
    },
  },
  mounted() {
    this.getSessions();
  },
});
</script>
