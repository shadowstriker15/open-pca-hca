<template>
  <div class="loader-container w-100 h-100">
    <loader v-if="isLoading"></loader>
    <div v-else style="height: 50rem">
      <Heatmap
        :session="session"
        :type="type"
        :layoutConfig="{
          marginLeft: 5,
          marginTop: 5,
          marginBottom: 100,
          marginRight: 150,
        }"
        :configs="configs"
        :passedMatrix="data"
        :yLabels.sync="yLabels"
        :xLabels.sync="xLabels"
        :xClusteringMethod="configs['xClusteringMethod']"
        :yClusteringMethod="configs['yClusteringMethod']"
        :colorScale="customColorScale"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";

// Components
import Heatmap from "./Heatmap/Index.vue";
import Loader from "../Loader.vue";

// Classes
import { ImportDF } from "@/classes/importDF";
import { Graph } from "@/classes/graph";
import { ProgramSession } from "@/classes/programSession";

// Types
import { Import } from "@/@types/import";
import { GraphConfigs } from "@/@types/graphConfigs";
import { HeatmapType } from "@/@types/graphs";

import { Matrix } from "ml-matrix";
import * as d3 from "d3";

export default Vue.extend({
  name: "HeatmapWrapper",
  props: {
    type: {
      type: String as PropType<HeatmapType>,
      required: false,
      default: "default" as HeatmapType,
    },
    configs: {
      type: Object as PropType<GraphConfigs>,
      required: true,
    },
  },
  data(): {
    data: number[][];
    yLabels: string[];
    xLabels: string[];
    matrix: Matrix;
    isLoading: boolean;
    session: ProgramSession | null;
    importDF: ImportDF | null;
    savedConfig: GraphConfigs | null;
  } {
    return {
      data: [],
      yLabels: [],
      xLabels: [],
      matrix: new Matrix(0, 0),
      isLoading: true,
      session: null,
      importDF: null,
      savedConfig: null,
    };
  },
  components: {
    Heatmap,
    loader: Loader,
  },
  watch: {
    type: {
      immediate: true,
      handler() {
        this.getData();
      },
    },
    configs: {
      deep: true,
      immediate: true,
      handler(val) {
        var recreateGraph = true;

        if (
          !this.savedConfig ||
          (this.savedConfig && this.savedConfig.labelSize != val.labelSize)
        ) {
          // Just updating the label size
          recreateGraph = false;
        }

        if (recreateGraph) this.getData();
        this.savedConfig = Object.assign({}, val);
      },
    },
  },
  computed: {
    minValue: function (): number {
      return this.matrix.min();
    },
    maxValue: function (): number {
      return this.matrix.max();
    },
  },
  methods: {
    /**
     * Initiate graph creation by making request to worker process
     * @author: Austin Pearce
     */
    getData(): void {
      this.isLoading = true;
      this.importDF = new ImportDF(new ProgramSession().session, true, true);
      // Request import dataframe from worker
      this.importDF.readDF();
    },
    /**
     * Custom color scale for heatmap
     * @param value
     * @author: Austin Pearce
     */
    customColorScale(value: number) {
      const convertScale = d3
        .scaleLinear()
        .range([this.minValue, this.maxValue]);

      // const colorScaleNeg = d3
      //   .scaleSequential(d3.interpolateBlues)
      //   .domain([-this.minValue, this.minValue]);

      const colorScalePos = d3
        .scaleSequential(d3.interpolateBlues)
        .domain([this.maxValue, 0]); // Values <= 0 will be the same color (change 0 to -this.maxvalue and uncomment the negative scale to allow color gradient across whole range)

      const converted = convertScale(value) as number;
      return colorScalePos(converted);
      // return converted < 0
      //   ? colorScaleNeg(converted)
      //   : colorScalePos(converted);
    },
    /**
     * Handle screenshot request
     * @author: Austin Pearce
     */
    screenshotRequested() {
      const graph = new Graph("hca-heatmap", this.type);
      let link = graph.createScreenshotLink("hcaHeatmapSvg");
      this.$emit("screenshotLink", link, graph.name);
    },
    /**
     * Handle worker process response for distance matrix
     * @param matrix Matrix returned from worker process
     * @author: Austin Pearce
     */
    handleDistanceMatrix(matrix: number[][]): void {
      this.data = matrix;
      this.matrix = new Matrix(matrix);
      this.isLoading = false;

      // Update session distance normalization
      if (this.session) {
        this.session.session.distance_normalize = this.configs.normalize;
        this.session.updateSession();
      }
    },
    /**
     * Handle worker process response for import dataframe
     * @param importObj Import object received from worker
     * @author: Austin Pearce
     */
    handleImportDataframe(importObj: Import): void {
      if (this.importDF) {
        this.yLabels = this.importDF.getClasses(importObj.matrix);

        if (this.type == "distance") {
          this.xLabels = this.yLabels;
        } else {
          this.xLabels = importObj.dimensionLabels as string[];
        }

        this.matrix = this.importDF.normalizeData(
          this.importDF.getNumbers(importObj.matrix),
          this.configs["normalize"]
        );

        if (this.type == "distance") {
          this.importDF.computeDistanceMatrix(
            this.matrix.to2DArray(),
            this.importDF.getClasses(importObj.matrix),
            this.configs["normalize"]
          );
        } else {
          this.data = this.matrix.to2DArray();
          this.isLoading = false;
        }
      }
    },
  },
  mounted() {
    this.session = new ProgramSession();
  },
});
</script>