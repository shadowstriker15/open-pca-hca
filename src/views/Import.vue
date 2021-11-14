<template>
  <v-container style="height: 100%">
    <v-col class="upload-container unselectable">
      <h1 class="text-center">Import label and run files</h1>
      <!-- Label Upload -->
      <v-row class="upload-row">
        <v-col>
          <h2 class="text-center">Label</h2>
          <div class="upload-box-container" @dragover.prevent @drop.prevent>
            <div class="upload-box" @drop="dragLabelFile">
              <v-col class="text-center">
                <img
                  draggable="false"
                  class="upload-icon"
                  src="@/assets/icons/upload-label.svg"
                />
                <p class="ma-0">Drag file here</p>
                <p class="text-muted ma-1">- or -</p>
                <div>
                  <v-btn
                    color="secondary"
                    depressed
                    rounded
                    :loading="isSelectingLabel"
                    @click="selectLabel"
                  >
                    Choose file
                  </v-btn>
                  <input
                    id="label-input"
                    class="d-none"
                    type="file"
                    accept=".xlsx, .csv, .txt"
                    @change="importLabel"
                  />
                </div>
              </v-col>
            </div>
          </div>
        </v-col>
        <!-- /Label Upload -->
        <!-- Runs Upload -->
        <v-col>
          <h2 class="text-center">Runs</h2>
          <div class="upload-box-container" @dragover.prevent @drop.prevent>
            <div class="upload-box" @drop="dragRunFiles">
              <v-col class="text-center">
                <img
                  draggable="false"
                  class="upload-icon"
                  src="@/assets/icons/upload-runs.svg"
                />
                <p class="ma-0">Drag files here</p>
                <p class="text-muted ma-1">- or -</p>
                <div>
                  <v-btn
                    color="secondary"
                    depressed
                    rounded
                    :loading="isSelectingRuns"
                    @click="selectRuns"
                  >
                    Choose files
                  </v-btn>
                  <input
                    id="runs-input"
                    class="d-none"
                    type="file"
                    accept=".xlsx, .csv, .txt"
                    @change="importRuns"
                    multiple
                  />
                </div>
              </v-col>
            </div>
          </div>
        </v-col>
        <!-- /Runs Upload -->
      </v-row>
      <div class="text-center">
        <v-btn
          class="custom-btn"
          color="primary"
          elevation="0"
          @click.stop="dialog = true"
          :disabled="labelPath == '' || !runPaths.length"
          >Upload
        </v-btn>
      </div>
    </v-col>
    <!-- Modal -->
    <v-dialog v-model="dialog" max-width="290">
      <v-card>
        <v-card-title class="headline">
          How is your data formatted?
        </v-card-title>
        <v-card-text>
          <!-- Format Option -->
          <v-chip-group
            mandatory
            v-model="dataFormat"
            active-class="primary--text"
          >
            <v-chip
              v-for="option in dataFormatOptions"
              :key="option.value"
              v-model="option.selected"
              :value="option.value"
            >
              {{ option.text }}
            </v-chip>
          </v-chip-group>
          <p>
            The samples and their dimension measurements are in each
            <strong>{{ dataFormat }}</strong>
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="submitUploads">
            Continue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- /Modal -->
  </v-container>
</template>

<style scoped>
.upload-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.upload-box-container {
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  display: flex;
}

.upload-row {
  padding-top: 3rem;
  flex-grow: 1;
}

.upload-box {
  justify-content: center;
  align-items: center;
  display: flex;
  border-radius: 1rem;
  background-color: #f2f0f5;
  border: 0.23rem dashed #dfcaff;
  height: 20rem;
  width: 100%;
  max-width: 380px;
}

.upload-icon {
  margin: auto;
  width: 5rem;
}

.text-muted {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.57);
}
</style>

<script lang="ts">
import Vue from "vue";
import { session } from "../@types/session";
import { Session } from "../classes/session";

export default Vue.extend({
  name: "Import",
  data(): {
    dialog: boolean;
    dataFormatOptions: {
      text: string;
      value: string;
    }[];
    dataFormat: "column" | "row";
    labelPath: string;
    runPaths: string[];
    isSelectingLabel: boolean;
    isSelectingRuns: boolean;
    session: Session | null;
  } {
    return {
      dialog: false,
      dataFormatOptions: [
        {
          text: "Column",
          value: "column",
        },
        {
          text: "Row",
          value: "row",
        },
      ],
      dataFormat: "column",
      labelPath: "",
      runPaths: [],
      isSelectingLabel: false,
      isSelectingRuns: false,
      session: null,
    };
  },
  methods: {
    submitUploads() {
      // Clear saved session preferences
      localStorage.clear();

      //Save session
      if (this.session) {
        this.session.createSession();
      }

      window.import
        .createDataframe(this.labelPath, this.runPaths, this.dataFormat)
        .then(() => {
          this.dialog = false;
          this.$router.push("/home");
          console.log("Done creating");
        });
    },
    selectLabel() {
      this.isSelectingLabel = true;
      window.addEventListener(
        "focus",
        () => {
          this.isSelectingLabel = false;
        },
        { once: true }
      );

      let label_input = document.getElementById(
        "label-input"
      ) as HTMLInputElement;
      label_input.click();
    },
    selectRuns() {
      this.isSelectingRuns = true;
      window.addEventListener(
        "focus",
        () => {
          this.isSelectingRuns = false;
        },
        { once: true }
      );

      let run_input = document.getElementById("runs-input") as HTMLInputElement;
      run_input.click();
    },
    importLabel(e: Event) {
      let input = e?.target as HTMLInputElement;
      if (input?.files) this.labelPath = input.files[0].path;
    },
    importRuns(e: Event) {
      let input = e?.target as HTMLInputElement;
      if (input?.files)
        this.runPaths = [...input.files].map((file) => file.path);
    },
    dragLabelFile(e: DragEvent) {
      let transfer = e?.dataTransfer as DataTransfer;
      if (transfer?.files) this.labelPath = transfer.files[0].path;
    },
    dragRunFiles(e: DragEvent) {
      let transfer = e?.dataTransfer as DataTransfer;
      if (transfer?.files) {
        // Only add unique paths
        const newPaths = [...transfer.files].map((file) => file.path);
        newPaths.forEach((path) => {
          if (this.runPaths.indexOf(path) === -1) {
            this.runPaths.push(path);
          }
        });
      }
    },
    getSession(): session | null {
      let sessionStr = localStorage.getItem("creating-session");
      if (sessionStr) return JSON.parse(sessionStr) as session;
      return null;
    },
  },
  mounted() {
    this.session = new Session(this.getSession());
  },
});
</script>
