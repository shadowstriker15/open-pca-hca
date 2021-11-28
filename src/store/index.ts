import Vue from "vue";
import Vuex from "vuex";
import AsyncComputed from 'vue-async-computed'
import VueTour from 'vue-tour'

require('vue-tour/dist/vue-tour.css')

Vue.use(Vuex);
Vue.use(AsyncComputed);
Vue.use(VueTour);

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {},
});
