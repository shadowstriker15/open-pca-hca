<template>
  <v-container class="h-100 unselectable">
    <v-col style="display: flex; flex-direction: column" class="h-100">
      <v-container
        style="display: flex; flex-direction: column; min-height: 38rem"
      >
        <h1 class="flex-fixed text-center mb-2">Create a new session</h1>
        <div class="flex-fill" style="padding: 1rem">
          <v-row>
            <v-col>
              <v-form ref="form" v-on:submit.prevent lazy-validation>
                <v-text-field
                  v-model="session.name"
                  :rules="nameRules"
                  required
                  label="Session name"
                  hide-details="auto"
                ></v-text-field>
              </v-form>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="h-100">
              <h2 class="ma-2">Import method</h2>
              <v-row>
                <v-col
                  @click="session.type = option.name"
                  v-for="option in importOptions"
                  :key="option.name"
                >
                  <div class="import-option accent-btn clickable">
                    <span
                      v-if="session.type == option.name"
                      class="selected-indicator"
                    >
                      <v-icon color="white"> mdi-check-bold </v-icon>
                    </span>
                    <img
                      class="option-icon"
                      draggable="false"
                      :src="option.icon"
                    />
                    <h3>{{ option.title }}</h3>
                    <p>{{ option.text }}</p>
                  </div>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </div>

        <div class="flex-fixed text-center">
          <v-btn
            class="custom-btn"
            color="primary"
            elevation="0"
            @click="validate"
            :disabled="!session.type"
            >Continue
          </v-btn>
        </div>
      </v-container>
    </v-col>
  </v-container>
</template>

<style scoped>
.import-option {
  position: relative;
  padding: 2rem;
  height: 100%;
}

.selected-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: 10px;
  top: 10px;
  height: 2rem;
  width: 2rem;
  background-color: #7cb342;
  border-radius: 50%;
}

.option-icon {
  display: block;
  width: 6rem;
  margin: auto;
  margin-bottom: 1rem;
}
</style>

<script lang="ts">
import Vue from "vue";
import { InputValidationRules } from "vuetify";
import { session } from "../../@types/session";

export default Vue.extend({
  name: "Create",
  data(): {
    importOptions: {
      title: string;
      name: string;
      text: string;
      icon: string;
    }[];
    session: session;
    sessions: session[];
  } {
    return {
      importOptions: [
        {
          title: "Single",
          name: "single",
          text: "Data is contained in a single dataframe file",
          icon: require("@/assets/icons/single.svg"),
        },
        {
          title: "Separated",
          name: "separated",
          text: "Data is separated in a label file and data file(s)",
          icon: require("@/assets/icons/separate.svg"),
        },
      ],
      session: {
        name: "",
        created_date: "",
        type: null,
      },
      sessions: [],
    };
  },
  computed: {
    nameRules(): InputValidationRules {
      return [
        (value) => !!value || "Required.",
        (value) => (value && value.length >= 3) || "Min 3 characters",
        (value) =>
          /^([A-Za-z_\-\s0-9\.])+$/.test(value) ||
          "One or more not allowed characters have been detected",
        (value) =>
          !this.sessions.some(
            (session) => session.name.toUpperCase() == value.toUpperCase()
          ) || "The session name must be unique",
      ];
    },
  },
  methods: {
    getTimestamp(): string {
      const date = new Date();
      return `${date.getFullYear()}-${
        date.getMonth() + 1
      }-${date.getDate()} ${date.toLocaleTimeString("it-IT")}`;
    },
    async validate() {
      let form = this.$refs?.form as HTMLFormElement;
      if (form?.validate()) {
        this.session.created_date = this.getTimestamp();
        await window.store.set("creatingSession", this.session);
        this.$router.push("/import");
      }
    },
    getSessions() {
      window.session.getSessions().then((response) => {
        this.sessions = response.map((obj) => obj as unknown as session);
      });
    },
  },
  mounted() {
    this.getTimestamp();
    this.getSessions();
  },
});
</script>
