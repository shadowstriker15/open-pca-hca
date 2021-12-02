<template>
  <v-tour
    name="intro-tour"
    :steps="steps"
    :options="{ highlight: true }"
    :callbacks="callbacks"
  >
    <template slot-scope="tour">
      <transition name="fade">
        <v-step
          v-if="tour.steps[tour.currentStep]"
          :key="tour.currentStep"
          :step="tour.steps[tour.currentStep]"
          :previous-step="tour.previousStep"
          :next-step="tour.nextStep"
          :stop="tour.stop"
          :skip="tour.skip"
          :is-first="tour.isFirst"
          :is-last="tour.isLast"
          :labels="tour.labels"
          :highlight="tour.highlight"
          :class="[
            'tour-step',
            tour.steps[tour.currentStep].class
              ? tour.steps[tour.currentStep].class
              : '',
          ]"
        >
          <template>
            <div slot="content" style="position: relative">
              <span class="skip-tour-container">
                <v-btn icon @click="tour.skip">
                  <v-icon small>mdi-close</v-icon>
                </v-btn></span
              >
              <span
                style="padding: 1rem 0"
                v-html="tour.steps[tour.currentStep].content"
              >
              </span>
            </div>
          </template>
          <!-- Action slots -->
          <template v-if="!tour.isLast">
            <div slot="actions">
              <v-btn :disabled="tour.isFirst" icon @click="tour.previousStep">
                <v-icon> mdi-chevron-left </v-icon>
              </v-btn>
              <v-btn icon @click="tour.nextStep">
                <v-icon> mdi-chevron-right </v-icon>
              </v-btn>
            </div>
          </template>
          <template v-else>
            <div
              style="margin-top: 0.5rem; margin-bottom: 0.5rem"
              slot="actions"
            >
              <v-btn @click="tour.finish" class="finish-btn"> Done </v-btn>
            </div>
          </template>
          <!-- /Action slots -->
        </v-step>
      </transition>
    </template>
  </v-tour>
</template>

<style scoped>
.v-step.tour-step {
  font-family: "Inter", sans-serif !important;
  background: white;
  color: #5e5e5e;
  border-radius: 0.5rem !important;
  padding: 1rem 1rem 0.25rem 1rem !important;
  box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent,
    0 4px 6px 5px rgb(0 0 0 / 10%), 0 2px 4px -1px rgb(0 0 0 / 6%);
}

@media (prefers-color-scheme: dark) {
  .v-step.tour-step {
    background: rgb(68, 68, 68);
    color: white;
  }
}

.skip-tour-container {
  display: block;
  margin-top: -20px;
  margin-left: 18px;
  width: 100%;
  text-align: right;
}

.finish-btn {
  background-color: var(--v-secondary-base) !important;
  color: var(--v-background-base) !important;
}
</style>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "Home",
  data(): {
    steps: {
      target: string | null;
      header?: { title: string };
      content: string;
      class?: string;
      params?: {
        placement?: "top" | "bottom" | "left" | "right";
        highlight?: boolean;
      };
    }[];
  } {
    return {
      steps: [
        {
          target: null,
          content: "Welcome to <strong>Open PCA HCA</strong>",
          class: "welcome",
          params: {
            highlight: false,
          },
        },
        {
          target: "#sidenav-list",
          content: "Here you can navigate between different graphs",
          params: {
            placement: "right",
            highlight: false,
          },
        },
        {
          target: ".toolbar",
          content: "This toolbar allows you to customize the selected graph",
          params: {
            placement: "bottom",
          },
        },
        {
          target: ".export-btn",
          content: "Here you can export the session data",
          params: {
            placement: "top",
            highlight: false,
          },
        },
      ],
    };
  },
  computed: {
    callbacks(): {
      onNextStep: (currentStep: number) => void;
      onPreviousStep: (currentStep: number) => void;
      onStop: (currentStep: number) => void;
      onSkip: (currentStep: number) => void;
      onFinish: (currentStep: number) => void;
    } {
      return {
        onNextStep: this.handleNextStep,
        onPreviousStep: this.handlePreviousStep,
        onStop: this.handleStop,
        onSkip: this.handleSkip,
        onFinish: this.handleFinish,
      };
    },
  },
  methods: {
    /**
     * Custom callback when going to next step
     * @param currentStep
     * @author: Austin Pearce
     */
    handleNextStep(currentStep: number): void {
      window.store.set("welcomeTour.lastStep", ++currentStep);
    },
    /**
     * Custom callback when going to previous step
     * @param currentStep
     * @author: Austin Pearce
     */
    handlePreviousStep(currentStep: number): void {
      window.store.set("welcomeTour.lastStep", --currentStep);
    },
    /**
     * Custom callback when stopping tour
     * @param currentStep
     * @author: Austin Pearce
     */
    handleStop(currentStep: number): void {
      window.store.set("welcomeTour.show", false);
    },
    /**
     * Custom callback when skipping tour (ie clicking ESC)
     * @param currentStep
     * @author: Austin Pearce
     */
    handleSkip(currentStep: number): void {
      window.store.set("welcomeTour.show", false);
    },
    /**
     * Custom callback when tour has been completed. Prevents tour from showing again
     * @author: Austin Pearce
     */
    handleFinish(): void {
      window.store.set("welcomeTour.show", false);
    },
    /**
     * Starts and presents the tour
     * @param startStep The step to start the tour at
     * @author: Austin Pearce
     */
    showTour(startStep: number = 0): void {
      this.$nextTick(() => {
        this.$tours["intro-tour"].start(String(startStep));
      });
    },
  },
  async mounted() {
    const showTour = await window.store.get("welcomeTour.show");
    if (showTour) {
      const startStep = await window.store.get("welcomeTour.lastStep");
      this.showTour(startStep);
    }
  },
  created() {
    // Listen from main thread to start tour
    window.main.listen("showTour", async (event) => {
      const startStep = await window.store.get("welcomeTour.lastStep");
      this.showTour(startStep);
    });
  },
});
</script>
