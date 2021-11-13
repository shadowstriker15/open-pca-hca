import Vue from "vue";
import { PropType } from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Import from "../views/Import.vue";
import Home from "../views/Home.vue";
import Selection from "../views/session/Selection.vue";
import Create from "../views/session/Create.vue";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: "/",
    name: "Session",
    component: Selection
  },
  {
    path: "/session/create",
    name: "Create",
    component: Create
  },
  {
    path: "/import",
    name: "Import",
    component: Import
  },
  {
    path: "/home",
    name: "Home",
    component: Home,
  },
  {
    path: "/about",
    name: "About",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/About.vue"),
  }
];

const router = new VueRouter({
  mode: process.env.IS_ELECTRON ? 'hash' : 'history', //TODO
  base: process.env.BASE_URL,
  routes,
});

export default router;
