import Vue, { PropType } from 'vue';
import { Fragment } from 'vue-frag'
import { VueExtensions } from '@/main';

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
    },
    xLabel: {
      type: String,
      required: false,
    },
    marginLeft: {
      type: Number,
      required: false,
      default: 150
    },
    fontSize: {
      type: Number,
      required: false,
      default: 0.8
    }
  },
  components: { Fragment },
  render() {
    return (
      <g transform={`translate(0, ${this.height})`}>
        {this.labels.map((label, i) => {
          const x = (this.$parent as VueExtensions).xAccessor(i);
          return (
            <fragment key={i}>
              <line x1={x} x2={x} y2="10" stroke="#bdc3c7" />
              <text
                transform={`translate(${x}, 15)rotate(-45)`}
                text-anchor="end"
                font-size={`${this.fontSize}em`}
                dominant-baseline="hanging"
              >
                <title>{label}</title>
                {label}
              </text>
            </fragment>
          );
        })}
        {
          this.xLabel ? <text transform={`translate(-${this.marginLeft}, 45)`}
            font-size={`${this.fontSize}em`}
            text-anchor="middle"
            x="50%"
          >
            {this.xLabel}
          </text> : ''
        }
      </g>
    );
  }
})
