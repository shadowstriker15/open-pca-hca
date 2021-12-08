<template>
  <g
    :transform="`translate(${
      translateType == 'left' ? -1 * width : width
    }, 0) ${translateType == 'right' ? 'scale(-1, 1)' : ''}`"
  >
    <line
      v-for="line in lines"
      :key="line.key"
      :y1="line.y1"
      :y2="line.y2"
      :x1="line.x1"
      :x2="line.x2"
      stroke="currentColor"
    />
  </g>
</template>

<script lang="ts">
import Vue from "vue";
import * as d3 from "d3";
import { Cluster } from "ml-hclust";
import { Line } from "./utils";
import { PropType } from "vue";

export default Vue.extend({
  name: "YDendrogram",
  props: {
    height: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    hierarchy: {
      type: Object as PropType<d3.HierarchyNode<any>>,
      required: true,
    },
    translateType: {
      type: String as PropType<"left" | "right">,
      required: false,
      default: "left",
    },
  },
  computed: {
    lines() {
      var lines: Line[] = [];
      const cluster = d3
        .cluster<Cluster>()
        .size([this.height, this.width])
        .separation(() => 1)(this.hierarchy);

      const scaleX = d3
        .scaleLinear()
        .domain([cluster.data.height, 0])
        .range([0, this.width - 5]);

      var key = 0;
      cluster.eachAfter((node) => {
        if (node.parent) {
          let line = {
            key: key++,
            x1: scaleX(node.data.height),
            x2: scaleX(node.parent.data.height),
            y1: node.x,
            y2: node.x,
          };
          lines.push(line);
        }
        if (node.children) {
          let line = {
            key: key++,
            x1: scaleX(node.data.height),
            x2: scaleX(node.data.height),
            y1: node.children[0].x,
            y2: node.children[node.children.length - 1].x,
          };
          lines.push(line);
        }
      });
      return lines;
    },
  },
});
</script>