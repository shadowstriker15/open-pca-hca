<template>
  <div>
    <v-navigation-drawer class="side-nav" mini-variant permanent app>
      <v-list dense nav class="py-0">
        <v-list-item v-for="item in items" :key="item.title" link>
          <v-list-item-icon :title="item.title">
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
.side-nav {
  background-color: #f8f8f8;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
}
</style>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "SideNav",

  data(): {
    items: Array<{ title: string; icon: string }>;
  } {
    return {
      items: [
        { title: "Dashboard", icon: "mdi-view-dashboard" },
        { title: "Photos", icon: "mdi-image" },
        { title: "About", icon: "mdi-help-box" },
      ],
    };
  },
});
</script>
