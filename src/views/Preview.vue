<template>
  <v-container>
    <v-row>
      <v-img :src="song.album_cover" max-width="300px" height="auto"> </v-img>
      <v-text-field label="Track Title" v-model="song.track_title" clearable>
      </v-text-field>
    </v-row>
    <v-row>
      <v-text-field label="Album" v-model="song.album_name" clearable>
      </v-text-field>
      <v-text-field label="Artist" v-model="song.artist_name" clearable>
      </v-text-field>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { PropType } from "vue";
import Vue from "vue";
import $ from "jquery";
import { Song } from "@/interfaces/Song";

export default Vue.extend({
  name: "Preview",
  data(): {
    song: Song;
  } {
    return {
      song: {
        artist_name: "",
        track_title: "",
        album_name: "",
        album_cover: "",
        genre: "",
      },
    };
  },
  methods: {},
  created() {
    const params = this.$route.params;
    this.song.artist_name = params.artist_name;
    this.song.track_title = params.track_title;
    this.song.album_name = params.album_name;
    this.song.album_cover = params.album_cover;
    this.song.genre = params.genre;
  },
});
</script>
