<template>
  <g :transform="`translate(0, -${translate ? height : 0})`">
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
import Vue, { PropType } from "vue";

import * as d3 from "d3";
import { Cluster } from "ml-hclust";
import { Line } from "./utils";

export default Vue.extend({
  name: "XDendrogram",
  props: {
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    hierarchy: {
      type: Object as PropType<d3.HierarchyNode<any>>,
      required: true,
    },
    translate: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  computed: {
    lines() {
      var lines: Line[] = [];
      const cluster = d3
        .cluster<Cluster>()
        .size([this.width, this.height])
        .separation(() => 1)(this.hierarchy);

      const scaleY = d3
        .scaleLinear()
        .domain([cluster.data.height, 0])
        .range([0, this.height - 5]);

      var key = 0;
      cluster.eachAfter((node) => {
        if (node.parent) {
          let line = {
            key: key++,
            y1: scaleY(node.data.height),
            y2: scaleY(node.parent.data.height),
            x1: node.x,
            x2: node.x,
          };
          lines.push(line);
        }
        if (node.children) {
          let line = {
            key: key++,
            y1: scaleY(node.data.height),
            y2: scaleY(node.data.height),
            x1: node.children[0].x,
            x2: node.children[node.children.length - 1].x,
          };
          lines.push(line);
        }
      });
      return lines;
    },
  },
});
</script>