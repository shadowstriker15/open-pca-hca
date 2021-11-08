<template>
  <v-sheet class="settings-container" outlined>
    <h3>Settings</h3>
    <v-col>
      <v-row
        v-if="
          ['hca-heatmap-default', 'hca-heatmap-distance'].includes(graphType)
        "
      >
        <v-select
          label="Graph Type"
          :value="graphType"
          @change="updateHeatmapType"
          :items="[
            {
              text: 'Sample / Dimensions',
              value: 'hca-heatmap-default',
            },
            {
              text: 'Sample Distance',
              value: 'hca-heatmap-distance',
            },
          ]"
        >
        </v-select>
      </v-row>
      <v-row
        v-for="propertyName in graphProperties[graphType]"
        :key="propertyName"
      >
        <v-col>
          <v-select
            v-model="graphConfigs[graphType][propertyName]"
            :items="properties[propertyName].options"
            :label="properties[propertyName].name"
            outlined
          ></v-select>
        </v-col>
      </v-row>
    </v-col>
  </v-sheet>
</template>

<style scoped>
.settings-container {
  box-shadow: 0px 0px 5px 0 rgb(0 0 0 / 16%), 0px 0px 5px 0 rgb(0 0 0 / 16%);
  border-radius: 10px;
  padding: 1rem;
}
</style>

<script lang="ts">
import Vue from "vue";
import { GraphTypes } from "../@types/graphs";
import { PropType } from "vue";
import { GraphConfigs, Configs, Clustering } from "../@types/graphConfigs";

export default Vue.extend({
  name: "GraphSetings",
  props: {
    graphType: {
      type: String as PropType<GraphTypes>,
      required: true,
    },
    graphConfigs: {
      type: Object as PropType<Configs>,
      required: true,
    },
  },
  data(): {
    graphProperties: { [key in GraphTypes]: (keyof GraphConfigs)[] };
    properties: {
      [key in keyof GraphConfigs]: {
        name: string;
        options: { text: string; value: string }[];
      };
    };
  } {
    return {
      graphProperties: {
        "pca-2d-scatter": ["normalize", "size"],
        "pca-3d-scatter": ["normalize", "size"],
        "hca-dendrogram": ["normalize", "size", "orientation"],
        "hca-heatmap-default": [
          "normalize",
          "xClusteringMethod",
          "yClusteringMethod",
        ],
        "hca-heatmap-distance": [
          "normalize",
          "xClusteringMethod",
          "yClusteringMethod",
        ],
      },
      properties: {
        orientation: {
          name: "Orientation",
          options: [
            {
              text: "Vertical",
              value: "vertical",
            },
            {
              text: "Horizontal",
              value: "horizontal",
            },
          ],
        },
        size: {
          name: "Size",
          options: [
            {
              text: "Small",
              value: "1",
            },
          ],
        },
        xClusteringMethod: {
          name: "X Clustering Method",
          options: [
            {
              text: "Ward",
              value: "ward",
            },
            {
              text: "Complete",
              value: "complete",
            },
            {
              text: "Single",
              value: "single",
            },
            {
              text: "UPGMA",
              value: "upgma",
            },
            {
              text: "WPGMA",
              value: "wpgma",
            },
            {
              text: "UPGMC",
              value: "upgmc",
            },
          ],
        },
        yClusteringMethod: {
          name: "Y Clustering Method",
          options: [
            {
              text: "Ward",
              value: "ward",
            },
            {
              text: "Complete",
              value: "complete",
            },
            {
              text: "Single",
              value: "single",
            },
            {
              text: "UPGMA",
              value: "upgma",
            },
            {
              text: "WPGMA",
              value: "wpgma",
            },
            {
              text: "UPGMC",
              value: "upgmc",
            },
          ],
        },
        normalize: {
          name: "Normalize",
          options: [
            {
              text: "None",
              value: "none",
            },
            {
              text: "Center",
              value: "center",
            },
            {
              text: "Linear Scaling (min-max)",
              value: "minMax",
            },
            {
              text: "Standardizing (z-score)",
              value: "zScore",
            },
          ],
        },
      },
    };
  },
  watch: {
    graphConfigs: {
      deep: true,
      handler(configs) {
        this.updateConfigs();
        this.$emit("update:graphConfigs", configs);
      },
    },
  },
  methods: {
    updateConfigs() {
      window.store.set("graphConfigs", this.graphConfigs);
    },
    updateHeatmapType(newVal: string) {
      let index = newVal.lastIndexOf("-");
      this.$emit("heatmapType", newVal.substring(index + 1));
    },
  },
});
</script>
