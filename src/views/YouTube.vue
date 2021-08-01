<template>
  <v-container>
    <!-- TODO NEED RULES -->
    <v-text-field
      label="YouTube Song Link"
      hint="ie https://youtube.com/example"
      persistent-hint
      solo
      v-model="link"
      clearable
    >
    </v-text-field>
    <v-dialog v-model="dialog" persistent max-width="290">
      <template v-slot:activator="{}">
        <!-- TODO CONDITIONALLY DISABLE -->
        <v-btn color="primary" dark @click="beginDownload" block>
          Submit
        </v-btn>
      </template>
      <v-card>
        <v-card-title class="text-h5">
          {{ isLoading ? "Please wait" : "Is this information accurate?" }}
        </v-card-title>
        <v-card-text v-if="!isLoading">
          <!-- Song Title -->
          <v-row>
            <v-col>
              <v-text-field
                label="Song Title"
                outlined
                v-model="song.track_title"
              >
              </v-text-field>
            </v-col>
          </v-row>
          <!-- Artist Name -->
          <v-row>
            <v-col>
              <v-text-field
                label="Artist Name"
                outlined
                v-model="song.artist_name"
              >
              </v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-text v-else>
          <v-progress-circular
            :size="70"
            :width="7"
            color="purple"
            indeterminate
          ></v-progress-circular>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="green darken-1"
            text
            @click="initGetAlbumName"
            v-if="!isLoading"
          >
            Agree
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import Vue from "vue";
import $ from "jquery";
import { Song } from "../interfaces/Song";
// import { ipcRenderer } from "electron";

declare global {
  interface Window {
    ipcRenderer: any;
  }
  interface Date {
    addSeconds(seconds: number): Date;
  }
}

interface Secrets {
  spotify_client_id: string;
  spotify_client_secret: string;
  access_token: string;
  expires_in: number;
  store_time: Date;
}

export default Vue.extend({
  name: "YouTube",
  data(): {
    link: string;
    dialog: boolean;
    isLoading: boolean;
    song: Song;
    secrets: Secrets;
  } {
    return {
      link: "",
      dialog: false,
      isLoading: false,
      song: {
        artist_name: "",
        track_title: "",
        album_name: "",
        album_cover: "",
        genre: "",
      },
      secrets: {
        spotify_client_id: "",
        spotify_client_secret: "",
        access_token: "",
        expires_in: 0,
        store_time: new Date(),
      },
    };
  },
  methods: {
    getSongInfo() {
      //TODO SHOW SUGGESTIONS FOR TITLE AND ARTIST IF NOT FOUND - IE USING KEYWORDS, CHANNEL NAME
      // this.link = "https://www.youtube.com/watch?v=Yegn0dZ-BfY";
      // this.link = "https://youtu.be/m2w6GkV3U6Q";
      (async () => {
        const info = await window.ipcRenderer.invoke("getSongInfo", {
          link: this.link,
        });
        if (info.videoDetails?.title) this.parseTitle(info.videoDetails.title);
        else this.isLoading = false; //TODO ADD FAIL MESSAGE
      })();
    },
    parseTitle(video_title: string) {
      var title = video_title;
      if (title.indexOf("(") >= 0 && title.indexOf(")") >= 0) {
        let end_index = title.indexOf("(") - 1;
        title = title.slice(0, end_index);
      } else if (title.indexOf("[") >= 0 && title.indexOf("]") >= 0) {
        let end_index = title.indexOf("[") - 1;
        title = title.slice(0, end_index);
      }
      if (title.indexOf(" - ") >= 0) {
        let title_array = title.split(" - ", 2);
        this.song.artist_name = title_array[0];
        this.song.track_title = title_array[1];
      } else {
        this.song.track_title = title;
      }
      this.isLoading = false;
    },
    // downloadSong(){
    //     this.dialog = false;
    //     window.ipcRenderer.sendSync('downloadSong', {
    //         link: this.link
    //     })
    // },
    initGetAlbumName() {
      this.getSecrets()
        .then((response) => {
          if (
            response.spotify_client_id != "" &&
            response.spotify_client_secret != ""
          ) {
            this.secrets.spotify_client_id = response.spotify_client_id;
            this.secrets.spotify_client_secret = response.spotify_client_secret;
            if (Object.prototype.hasOwnProperty.call(response, "access_token"))
              this.secrets.access_token = response.access_token;
            if (!this.isTokenValid()) this.getNewToken();
            this.getAlbumName();
          } else {
            //TODO ERROR
          }
        })
        .catch((response) => {
          // TODO
          console.log("fail", response);
        });
    },
    getAlbumName() {
      // return (async () => {
      //   return await window.ipcRenderer.invoke("getAlbumName", {
      //     artist_name: this.artist_name,
      //     song_title: this.song_title,
      //   });
      // })();
      $.ajax({
        url:
          "https://api.spotify.com/v1/search?" +
          $.param({
            q: `artist: ${this.song.artist_name} track: ${this.song.track_title}`,
            type: "track",
          }),
        method: "GET",
        headers: {
          Authorization: "Bearer " + this.secrets.access_token,
        },
      })
        .then((response) => {
          const album = response.tracks.items[0].album;
          this.song.album_name = album.name;
          this.song.album_cover = album.images[0].url;
          this.$router.push({
            name: "Preview",
            params: {
              artist_name: this.song.artist_name,
              track_title: this.song.track_title,
              album_name: this.song.album_name,
              album_cover: this.song.album_cover,
              genre: this.song.genre,
            },
          });
        })
        .catch((response) => {
          //TODO
          console.log("BAD: ", response);
        });
    },
    isTokenValid() {
      if (this.secrets.access_token != "") {
        let now = new Date();
        let expire_time = new Date(this.secrets.store_time).addSeconds(
          this.secrets.expires_in
        );
        return expire_time < now;
      }
      return false;
    },
    getNewToken() {
      let url = "https://accounts.spotify.com/api/token";
      $.ajax({
        url: url,
        type: "POST",
        data: {
          grant_type: "client_credentials",
        },
        headers: {
          Authorization:
            "Basic " +
            btoa(
              this.secrets.spotify_client_id +
                ":" +
                this.secrets.spotify_client_secret
            ),
        },
      })
        .then((response: any) => {
          this.secrets.access_token = response.access_token;
          this.secrets.expires_in = response.expires_in;
          this.secrets.store_time = new Date();
          this.updateSecrets(this.secrets);
        })
        .fail((response: any) => {
          //TODO HANDLE THIS
          console.error(response);
        });
    },
    updateSecrets(secrets: Secrets) {
      window.ipcRenderer.invoke("updateSecrets", {
        secrets: secrets,
      });
    },
    getSecrets() {
      return (async () => {
        return await window.ipcRenderer.invoke("getSecrets");
      })();
    },
    beginDownload() {
      this.isLoading = true;
      this.dialog = true;
      this.getSongInfo();
    },
  },
});

Date.prototype.addSeconds = function (seconds: number): Date {
  this.setSeconds(this.getSeconds() + seconds);
  return this;
};
</script>