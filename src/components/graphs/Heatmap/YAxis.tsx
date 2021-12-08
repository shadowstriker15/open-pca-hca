import Vue, { PropType } from "vue";
import { Fragment } from 'vue-frag'
import { VueExtensions } from "@/main";

export default Vue.extend({
  name: 'YAxis',
  props: {
    labels: {
      type: Array as PropType<string[]>,
      required: true
    },
    width: {
      type: Number,
      required: true
    },
    position: {
      type: String as PropType<'left' | 'right'>,
      required: false,
      default: 'left'
    },
    translate: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  components: { Fragment },
  render() {
    return (
      <g transform={`translate(${this.translate ? this.width : 0}, 0)`}>
        {this.labels.map((label, i) => {
          const y = (this.$parent as VueExtensions).yAccessor(i);
          return (
            <fragment key={i}>
              <line y1={y} y2={y} x2={this.position == 'right' ? 10 : 15} stroke="#bdc3c7" />
              <text
                transform={`translate(${this.position == 'right' ? 15 : 0}, ${y})`}
                text-anchor={this.position == 'right' ? 'start' : 'end'}
                font-size="0.8em"
                dominant-baseline="middle"
              >
                <title>{label}</title>
                {label}
              </text>
            </fragment>
          );
        })}
      </g>
    );
  }
})