<template>
  <v-sheet class="settings-container" outlined>
    <h3>Settings</h3>
    <v-col>
      <!-- Heatmap type selector -->
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
              text: 'Samples / Dimensions Heatmap',
              value: 'hca-heatmap-default',
            },
            {
              text: 'Sample Distances Heatmap',
              value: 'hca-heatmap-distance',
            },
          ]"
        >
        </v-select>
      </v-row>
      <!-- /Heatmap type selector -->
      <!-- Graph's settings -->
      <v-row
        v-for="propertyName in graphProperties[graphType]"
        :key="propertyName"
      >
        <v-col>
          <!-- Size slider -->
          <v-slider
            v-if="propertyName == 'size'"
            :label="properties[propertyName].name"
            v-model="graphConfigs[graphType][propertyName]"
            thumb-label
            min="5"
            max="50"
            ticks
          ></v-slider>
          <!-- /Size slider -->
          <!-- Label size slider -->
          <v-slider
            v-else-if="propertyName == 'labelSize'"
            :label="properties[propertyName].name"
            v-model="graphConfigs[graphType][propertyName]"
            thumb-label
            min="0.1"
            max="1.5"
            step="0.1"
          ></v-slider>
          <!-- /Label size slider -->
          <!-- Setting property options -->
          <v-select
            v-else
            v-model="graphConfigs[graphType][propertyName]"
            :items="
              getPropertyOptions(graphType, properties[propertyName].value)
            "
            :label="properties[propertyName].name"
            outlined
          ></v-select>
          <!-- /Setting property options -->
        </v-col>
      </v-row>
      <!-- /Graph's settings -->
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
import Vue, { PropType } from "vue";
import { GraphTypes } from "../@types/graphs";
import { GraphsConfigs, Property } from "../@types/graphConfigs";
import { session } from "@/@types/session";

export default Vue.extend({
  name: "GraphSetings",
  props: {
    session: {
      type: Object as PropType<session>,
      required: true,
    },
    graphType: {
      type: String as PropType<GraphTypes>,
      required: true,
    },
    graphConfigs: {
      type: Object as PropType<GraphsConfigs>,
      required: true,
    },
  },
  data(): {
    graphProperties: { [key in GraphTypes]: Property[] };
    properties: { [key in Property]: { value: Property; name: string } };
  } {
    return {
      graphProperties: {
        "pca-2d-scatter": ["normalize", "size"],
        "pca-3d-scatter": ["normalize", "size"],
        "hca-dendrogram": [
          "normalize",
          "clusteringMethod",
          "orientation",
          "labelSize",
        ],
        "hca-heatmap-default": [
          "normalize",
          "xClusteringMethod",
          "yClusteringMethod",
          "labelSize",
        ],
        "hca-heatmap-distance": [
          "normalize",
          "xClusteringMethod",
          "yClusteringMethod",
          "labelSize",
        ],
      },
      properties: {
        orientation: { value: "orientation", name: "Orientation" },
        size: { value: "size", name: "Size" },
        xClusteringMethod: {
          value: "xClusteringMethod",
          name: "X Clustering Method",
        },
        yClusteringMethod: {
          value: "yClusteringMethod",
          name: "Y Clustering Method",
        },
        clusteringMethod: {
          value: "clusteringMethod",
          name: "Clustering Method",
        },
        normalize: { value: "normalize", name: "Dimension Scaling" },
        labelSize: { value: "labelSize", name: "Label Size" },
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
    /**
     * Update the session's graph configurations
     * @author: Austin Pearce
     */
    updateConfigs(): void {
      window.session.saveInfo(this.session, "graphConfigs", this.graphConfigs);
    },
    /**
     * Update the type of heatmap to show
     * @param newVal The new heatmap type to show
     * @author: Austin Pearce
     */
    updateHeatmapType(newVal: string): void {
      let index = newVal.lastIndexOf("-");
      this.$emit("heatmapType", newVal.substring(index + 1));
    },
    /**
     * Get a setting property's options
     * @param type The currently viewed graph
     * @param property The setting property to get options for
     * @returns The setting property's options
     * @author: Austin Pearce
     */
    getPropertyOptions(
      type: GraphTypes,
      property: Property
    ): { text: string; value: string }[] {
      if (property == "normalize") {
        let options = [
          {
            text: "None",
            value: "none",
          },
          {
            text: "Centering only",
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
        ];
        if (["pca-2d-scatter", "pca-3d-scatter"].includes(type)) {
          return options.filter((option) => option.value != "none");
        } else if (
          [
            "hca-dendrogram",
            "hca-heatmap-default",
            "hca-heatmap-distance",
          ].includes(type)
        ) {
          return options.filter((option) => option.value != "center");
        }
      } else if (
        ["clusteringMethod", "xClusteringMethod", "yClusteringMethod"].includes(
          property
        )
      ) {
        return [
          {
            text: "Ward's",
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
        ];
      } else if (property == "orientation") {
        return [
          {
            text: "Vertical",
            value: "vertical",
          },
          {
            text: "Horizontal",
            value: "horizontal",
          },
        ];
      }
      return [];
    },
  },
});
</script>
