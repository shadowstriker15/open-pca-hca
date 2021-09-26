import Vue, { PropType } from "vue";
import { MapNumToNum } from './types';
import { ChartDimensions } from './utils';
import { Fragment } from 'vue-fragment'

interface IYAxisProps {
  labels: string[];
  yAccessor: MapNumToNum;
  dimensions: ChartDimensions;
}

export default Vue.extend({
  name: 'YAxis',
  props: {
    labels: {
      type: Array as PropType<string[]>,
    },
    dimensions: {
      type: Object as PropType<ChartDimensions>
    }
  },
  components: { Fragment },
  render() {
    return (
      <g transform={`translate(${this.dimensions.boundedWidth}, 0)`}>
        {this.labels.map((label, i) => {
          const y = this.$parent.yAccessor(i);
          return (
            <fragment key={i}>
              <line y1={y} y2={y} x2="10" stroke="#bdc3c7" />
              <text
                transform={`translate(15, ${y})`}
                text-anchor="start"
                font-size="0.8em"
                dominant-baseline="middle"
              >
                {label}
              </text>
            </fragment>
          );
        })}
      </g>
    );
  }
})