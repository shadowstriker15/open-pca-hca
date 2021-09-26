import Vue, { PropType } from 'vue';
import { ChartDimensions } from './utils';
import { Fragment } from 'vue-fragment'

interface IXAxisProps {
  labels: string[];
  dimensions: ChartDimensions;
}

export default Vue.extend({
  name: 'XAxis',
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
      <g transform={`translate(0, ${this.dimensions.boundedHeight})`}>
        {this.labels.map((label, i) => {
          const x = this.$parent.xAccessor(i);
          return (
            <fragment key={i}>
              <line x1={x} x2={x} y2="10" stroke="#bdc3c7" />
              <text
                transform={`translate(${x}, 15)rotate(-45)`}
                text-anchor="end"
                font-size="0.8em"
                dominant-baseline="hanging"
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
