<template>
  <v-app>
    <v-icon
      v-if="!['/', '/home'].includes(this.$route.path)"
      large
      style="position: absolute; left: 7px; top: 7px; z-index: 999"
      @click="back"
    >
      mdi-chevron-left-circle
    </v-icon>
    <v-main :class="this.$route.path == '/home' ? 'home-bg' : ''">
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>
.home-bg {
  background: #f5f7fb;
}
</style>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "App",

  data: () => ({
    //
  }),
  methods: {
    back() {
      window.history.length >= 2 ? this.$router.go(-1) : this.$router.push("/");
    },
  },
  created() {
    // Listens for the main process to request to change page
    window.main.changeRoute("changeRouteTo", (event, path) => {
      if (this.$route.path != path) this.$router.push(path);
    });
  },
});
</script>
