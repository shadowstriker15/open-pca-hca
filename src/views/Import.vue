<template>
  <v-container>
    <v-col>
      <p>Please upload the required files</p>
      <!-- Label Upload -->
      <v-row>
        <v-file-input
          label="Label file"
          id="label-input"
          prepend-icon="mdi-file-upload"
          accept=".xlsx, .csv, .txt"
          truncate-length="15"
        ></v-file-input>
      </v-row>
      <!-- Runs Upload -->
      <v-row>
        <v-file-input
          label="Run file(s)"
          id="run-input"
          prepend-icon="mdi-file-upload"
          accept=".xlsx, .csv, .txt"
          small-chips
          multiple
          truncate-length="15"
        >
          <template v-slot:selection="{ text }">
            <v-chip small label color="primary">
              {{ text }}
            </v-chip>
          </template>
        </v-file-input>
      </v-row>
      <div class="text-center">
        <v-btn class="ma-2" color="primary" dark @click.stop="dialog = true"
          >Submit
          <v-icon dark right>mdi-arrow-right</v-icon>
        </v-btn>
        <v-btn block elevation="2" href="/home">TEST</v-btn>
      </div>
    </v-col>
    <!-- Modal -->
    <v-dialog v-model="dialog" max-width="290">
      <v-card>
        <v-card-title class="headline">
          Please select the appropriate format options
        </v-card-title>
        <v-card-text>
          <p>Some helpful text here</p>
          <!-- Format Option -->
          <label>Data Format Options</label>
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

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "Import",
  data(): {
    dialog: boolean;
    dataFormatOptions: Array<{
      text: string;
      value: string;
    }>;
    dataFormat: "column" | "row";
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
    };
  },
  methods: {
    submitUploads() {
      this.dialog = false;

      let label_input = document.getElementById(
        "label-input"
      ) as HTMLInputElement;

      let run_input = document.getElementById("run-input") as HTMLInputElement;

      if (label_input?.files && run_input?.files) {
        let label_file = label_input.files[0];
        let run_files = run_input.files;
        window.import.createDataframe(
          label_file.path,
          [...run_files].map((file) => file.path),
          this.dataFormat
        );
      }
    },
  },
});
</script>
