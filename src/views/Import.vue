<template>
  <v-container style="height: 100%">
    <v-col class="upload-container unselectable">
      <h1 class="text-center">{{ importTitle }}</h1>
      <v-row class="upload-row">
        <!-- Label Upload -->
        <v-col v-if="session && session.session.type != 'single'">
          <h2 class="text-center">Label</h2>
          <div class="upload-box-container" @dragover.prevent @drop.prevent>
            <div
              :class="[
                'upload-box',
                !labelFile ? 'align-center' : '',
                isSingleSession ? 'full-width' : 'half-width',
              ]"
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
          <h2 class="text-center">
            <span style="position: relative"
              >Data
              <v-dialog max-width="290">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    class="info-btn"
                    icon
                    x-small
                    v-bind="attrs"
                    v-on="on"
                    color="info"
                  >
                    <v-icon>mdi-information</v-icon>
                  </v-btn>
                </template>
                <template v-slot:default="dialog">
                  <v-card class="pt-5">
                    <v-card-text
                      >Data saved in a single file or a set of data from
                      replicated measurements saved in multiple files can be
                      imported. <br />
                      When multiple files are to be imported, the files'
                      dimensions must be consistent.
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="gray" text @click="dialog.value = false">
                        CLOSE
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
              </v-dialog></span
            >
          </h2>
          <div class="upload-box-container" @dragover.prevent @drop.prevent>
            <div
              :class="[
                'upload-box',
                !runFiles.length ? 'align-center' : '',
                isSingleSession ? 'full-width' : 'half-width',
              ]"
              @drop="dragRunFiles"
            >
              <v-col v-if="!runFiles.length" class="text-center">
                <img
                  draggable="false"
                  class="upload-icon"
                  src="@/assets/icons/upload-runs.svg"
                />
                <p class="ma-0">{{ runText }}</p>
                <p class="text-muted ma-1">- or -</p>
                <div>
                  <v-btn
                    color="secondary"
                    depressed
                    rounded
                    :loading="isSelectingRuns"
                    @click="selectRuns"
                  >
                    {{ runBtnText }}
                  </v-btn>
                  <input
                    id="runs-input"
                    class="d-none"
                    type="file"
                    accept=".xlsx, .csv, .txt"
                    @change="importRuns"
                    :multiple="!isSingleSession"
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
          @click.stop="importClicked"
          :disabled="isImportDisabled"
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
  padding: 1rem;
}

.upload-box.full-width {
  max-width: 50vw;
}

.upload-box.half-width {
  max-width: 37vw;
}

@media (prefers-color-scheme: dark) {
  .upload-box {
    background-color: #37284e;
  }
}

.upload-icon {
  margin: auto;
  width: 5rem;
}

.text-muted {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.57);
}

@media (prefers-color-scheme: dark) {
  .text-muted {
    color: rgba(248, 248, 248, 0.57);
  }
}

.file-container {
  display: flex;
  background-color: var(--v-background-base);
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

.info-btn {
  position: absolute;
  bottom: 10px;
  right: -17px;
}
</style>

<script lang="ts">
import Vue from "vue";
import { session } from "../@types/session";
import { ProgramSession } from "../classes/programSession";

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
    session: ProgramSession | null;
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
  computed: {
    isSingleSession(): boolean {
      return this.session?.session.type == "single";
    },
    importTitle(): string {
      return this.isSingleSession
        ? "Import dataframe"
        : "Import label and data files";
    },
    runText(): string {
      return this.isSingleSession ? "Drag file here" : "Drag files here";
    },
    runBtnText(): string {
      return this.isSingleSession ? "Choose file" : "Choose files";
    },
    isImportDisabled(): boolean {
      return this.isSingleSession
        ? !this.runFiles.length
        : !this.labelFile || !this.runFiles.length;
    },
  },
  methods: {
    /**
     * Handle import button clicked
     * @author: Austin Pearce
     */
    importClicked(): void {
      if (this.session?.session.type == "single") {
        this.dataFormat = "row";
        this.submitUploads();
      } else {
        this.dialog = true;
      }
    },
    /**
     * Submit the selected files and create session
     * @author: Austin Pearce
     */
    submitUploads(): void {
      //Save session
      this.session?.createSession();

      if (this.session && this.runFiles.length) {
        window.import
          .createDataframe(
            this.session.session,
            this.labelFile ? this.labelFile.path : "",
            this.getFilePaths([...this.runFiles]),
            this.dataFormat
          )
          .then((updatedSession) => {
            if (this.session) {
              this.session.session = updatedSession;
              this.session.updateSession();
            }
            this.dialog = false;
            this.$router.push("/home");
            console.log("Done creating");
          })
          .catch((err) => {
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
    /**
     * Initiate label file selection
     * @author: Austin Pearce
     */
    selectLabel(): void {
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
    /**
     * Initiate run file selection
     * @author: Austin Pearce
     */
    selectRuns(): void {
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
    /**
     * Select label for import
     * @param e Event that triggers method
     * @author: Austin Pearce
     */
    importLabel(e: Event): void {
      let input = e?.target as HTMLInputElement;
      if (input?.files) this.labelFile = input.files[0];
    },
    /**
     * Select runs for import
     * @param e Event that triggers method
     * @author: Austin Pearce
     */
    importRuns(e: Event): void {
      let input = e?.target as HTMLInputElement;
      if (input?.files) this.runFiles = [...input.files];
    },
    /**
     * Handle drag over on label file container
     * @param e Drag event that triggers method
     * @author: Austin Pearce
     */
    dragLabelFile(e: DragEvent): void {
      let transfer = e?.dataTransfer as DataTransfer;
      if (transfer?.files) this.labelFile = transfer.files[0];
    },
    /**
     * Handle drag over on run file container
     * @param e Drag event that triggers method
     * @author: Austin Pearce
     */
    dragRunFiles(e: DragEvent): void {
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
    /**
     * Get session being created
     * @returns Promise of current session
     * @author: Austin Pearce
     */
    async getSession(): Promise<session | null> {
      let session = await window.store.get("creatingSession");
      if (session) return session as session;
      return null;
    },
    /**
     * Parse paths of selected files
     * @param files Files to parse from
     * @returns Array of file paths
     * @author: Austin Pearce
     */
    getFilePaths(files: File[]): string[] {
      return [...files].map((file) => file.path);
    },
    /**
     * Extract the filename from passed path
     * @param path The absolute path of a file
     * @returns Filename extracted from path
     * @author: Austin Pearce
     */
    extractFilename(path: string): string {
      return path.substring(path.lastIndexOf("\\") + 1);
    },
    /**
     * Filters out a specified run file
     * @param file File to filter out
     * @author: Austin Pearce
     */
    removeRunFile(file: File): void {
      this.runFiles = this.runFiles.filter((obj) => obj.path != file.path);
    },
  },
  async mounted() {
    const session = await this.getSession();
    this.session = new ProgramSession(session);
  },
});
</script>
