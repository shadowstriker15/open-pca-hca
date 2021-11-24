<template>
  <v-container style="height: 100%">
    <v-col class="upload-container unselectable">
      <h1 class="text-center">Import label and data files</h1>
      <!-- Label Upload -->
      <v-row class="upload-row">
        <v-col>
          <h2 class="text-center">Label</h2>
          <div class="upload-box-container" @dragover.prevent @drop.prevent>
            <div
              :class="['upload-box', !labelFile ? 'align-center' : '']"
              @drop="dragLabelFile"
            >
              <v-col v-if="!labelFile" class="text-center">
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
              <v-col v-else>
                <v-row class="file-container">
                  <span class="file-name">
                    {{ extractFilename(labelFile.path) }}
                  </span>
                  <v-btn icon color="gray" @click="labelFile = null">
                    <v-icon>mdi-close-circle</v-icon>
                  </v-btn>
                </v-row>
              </v-col>
            </div>
          </div>
        </v-col>
        <!-- /Label Upload -->
        <!-- Runs Upload -->
        <v-col>
          <h2 class="text-center">Data</h2>
          <div class="upload-box-container" @dragover.prevent @drop.prevent>
            <div
              :class="['upload-box', !runFiles.length ? 'align-center' : '']"
              @drop="dragRunFiles"
            >
              <v-col v-if="!runFiles.length" class="text-center">
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
              <v-col style="overflow: auto" v-else>
                <v-row
                  v-for="file in runFiles"
                  :key="file.path"
                  class="file-container"
                >
                  <span class="file-name">{{
                    extractFilename(file.path)
                  }}</span>
                  <v-btn icon color="gray" @click="removeRunFile(file)">
                    <v-icon>mdi-close-circle</v-icon>
                  </v-btn>
                </v-row>
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
          :disabled="!labelFile || !runFiles.length"
          >Import
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
            Each <strong>{{ dataFormat }}</strong> records data from each
            sample. Each dimension is recorded in each
            {{ dataFormat == "row" ? "column" : "row" }}.
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
  display: flex;
  overflow: auto;
  justify-content: center;
  border-radius: 1rem;
  background-color: #f2f0f5;
  border: 0.23rem dashed #dfcaff;
  height: 20rem;
  width: 100%;
  max-width: 380px;
  padding: 1rem;
}

.upload-icon {
  margin: auto;
  width: 5rem;
}

.text-muted {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.57);
}

.file-container {
  display: flex;
  background-color: white;
  border-radius: 0.5rem;
  padding: 0.5rem;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.file-name {
  text-overflow: ellipsis;
  width: 80%;
  overflow: hidden;
  white-space: nowrap;
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
    labelFile: File | null;
    runFiles: File[];
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
      labelFile: null,
      runFiles: [],
      isSelectingLabel: false,
      isSelectingRuns: false,
      session: null,
    };
  },
  watch: {
    dialog(val) {
      if (val) this.$emit("hideAlert");
    },
  },
  methods: {
    submitUploads() {
      // Clear saved session preferences
      localStorage.clear();

      //Save session
      this.session?.createSession();

      if (this.labelFile && this.runFiles.length) {
        window.import
          .createDataframe(
            this.labelFile.path,
            this.getFilePaths([...this.runFiles]),
            this.dataFormat
          )
          .then(() => {
            this.dialog = false;
            this.$router.push("/home");
            console.log("Done creating");
          })
          .catch((err) => {
            localStorage.clear();
            this.session?.deleteSession();
            console.error("Failed to import user files", err);
            this.dialog = false;
            this.$emit(
              "showAlert",
              "error",
              "The dimensions of the label and/or data files are not consistently formatted",
              -1
            );
          });
      }
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
      if (input?.files) this.labelFile = input.files[0];
    },
    importRuns(e: Event) {
      let input = e?.target as HTMLInputElement;
      if (input?.files) this.runFiles = [...input.files];
    },
    dragLabelFile(e: DragEvent) {
      let transfer = e?.dataTransfer as DataTransfer;
      if (transfer?.files) this.labelFile = transfer.files[0];
    },
    dragRunFiles(e: DragEvent) {
      let transfer = e?.dataTransfer as DataTransfer;
      if (transfer?.files) {
        // Only add unique paths
        const newPaths = [...transfer.files];
        let runPaths = this.getFilePaths([...this.runFiles]);
        newPaths.forEach((file) => {
          if (runPaths.indexOf(file.path) === -1) {
            this.runFiles.push(file);
          }
        });
      }
    },
    getSession(): session | null {
      let sessionStr = localStorage.getItem("creating-session");
      if (sessionStr) return JSON.parse(sessionStr) as session;
      return null;
    },
    getFilePaths(files: File[]): string[] {
      return [...files].map((file) => file.path);
    },
    extractFilename(path: string) {
      return path.substring(path.lastIndexOf("\\") + 1);
    },
    removeRunFile(file: File) {
      this.runFiles = this.runFiles.filter((obj) => obj.path != file.path);
    },
  },
  mounted() {
    this.session = new Session(this.getSession());
  },
});
</script>
