import Vue, { PropType } from 'vue';
import { ChartDimensions } from './utils';
import { Fragment } from 'vue-frag'

export default Vue.extend({
  name: 'XAxis',
  props: {
    labels: {
      type: Array as PropType<string[]>,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  components: { Fragment },
  render() {
    return (
      <g transform={`translate(0, ${this.height})`}>
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
