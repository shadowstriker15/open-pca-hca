import Vue from "vue";
import { PropType } from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Import from "../views/Import.vue";
import Home from "../views/Home.vue";
import YouTube from "../views/YouTube.vue";
import { Song } from "../interfaces/Song";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: "/",
    name: "Import",
    component: Import,
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
  },
  {
    path: "/youtube",
    name: "YouTube",
    component: () =>
      import(/* webpackChunkName: "youtube" */ "../views/YouTube.vue"),
  },
  {
    path: "/spotify",
    name: "Spotify",
    component: () =>
      import(/* webpackChunkName: "spotify" */ "../views/Spotify.vue"),
  },
  {
    path: "/preview/:artist_name&track_title",
    name: "Preview",
    props: {
      song: {
        type: Object as PropType<Song>,
      }
    },
    component: () =>
      import(/* webpackChunkName: "preview" */ "../views/Preview.vue"),
  }
];

const router = new VueRouter({
  // mode: process.env.IS_ELECTRON ? 'hash' : 'history', //TODO
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
