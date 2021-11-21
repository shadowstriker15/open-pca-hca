<template>
  <g id="tooltip" visibility="hidden">
    <!-- Shadow -->
    <rect
      x="3"
      y="4"
      width="80"
      height="65"
      fill="black"
      opacity="0.3"
      rx="4"
      ry="4"
    />
    <!-- Container -->
    <rect width="80" height="65" fill="white" rx="4" ry="4" />
    <text x="4" y="18">
      <tspan x="4"></tspan>
      <tspan x="4" dy="20"></tspan>
      <tspan x="4" dy="20"></tspan>
    </text>
  </g>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "Tooltip",
  methods: {
    showTooltip(event: MouseEvent, data: { x: string; y: string; z: number }) {
      let tooltip = document.getElementById("tooltip");

      if (tooltip) {
        let svg = document.getElementById(
          "hcaHeatmapSvg"
        ) as unknown as SVGGraphicsElement;
        let CTM = svg.getScreenCTM() as DOMMatrix;

        // Make tooltip follow user's cursor
        var x = (event.clientX - CTM.e + 6) / CTM.a;
        var y = (event.clientY - CTM.f + 20) / CTM.d;
        tooltip.setAttributeNS(null, "transform", `translate(${x} ${y})`);

        let tooltipText = tooltip.getElementsByTagName("text")[0];
        let tspans = tooltipText.getElementsByTagName("tspan");

        tspans[0].innerHTML = `x: ${data.x}`;
        tspans[1].innerHTML = `y: ${data.y}`;
        tspans[2].innerHTML = `z: ${data.z}`;

        let tooltipRects = tooltip.getElementsByTagName("rect");

        let length = Math.max(
          tspans[0].getComputedTextLength(),
          tspans[1].getComputedTextLength(),
          tspans[2].getComputedTextLength()
        );

        // Resize toolbar's width to fix content
        for (let i = 0; i < tooltipRects.length; i++) {
          tooltipRects[i].setAttributeNS(
            null,
            "width",
            (length + 8).toString()
          );
        }

        tooltip.setAttributeNS(null, "visibility", "visible");
      }
    },
    hideTooltip() {
      let tooltip = document.getElementById("tooltip");
      tooltip?.setAttributeNS(null, "visibility", "hidden");
    },
  },
});
</script>