<template>
  <v-card flat>
    <v-card-title>文件</v-card-title>
    <v-card-text>
      <v-btn color="primary" @click="open_file_dialog()">
        <v-icon>mdi-upload</v-icon> 上传文件
      </v-btn>
      <v-progress-linear indeterminate v-show="progress" />
      <input
        type="file"
        value=""
        id="file"
        @change="upload_file"
        hidden
        multiple
      />
    </v-card-text>
    <v-sheet class="ma-5">
      <v-sheet>
        <v-row v-for="f in files" :key="f.name">
          <v-col class="name">
            <v-btn icon :href="file_link(f)" v-if="!f.folder">
              <v-icon>mdi-download</v-icon>
            </v-btn>
            <v-btn icon v-else @click="enter(f.name)">
              <v-icon>mdi-folder-open</v-icon>
            </v-btn>

            {{ f.name }}
            
        <div class="description" v-if="!f.folder">
          大小: {{ (f.size / 1024 / 1024).toFixed(2) }} MB 创建于:
          {{ new Date(f.ctime * 1000).toLocaleString() }} 修改于:
          {{ new Date(f.mtime * 1000).toLocaleString() }}
        </div>
            </v-col
          >
          <v-spacer></v-spacer>
          <v-col class="opers">
            <v-btn class="copy" :data-clipboard-text="copy_file_path(f)">
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-sheet>
    </v-sheet>
  </v-card>
</template>

<script>
import api from "../api";
import axios from "axios";
import Clipboard from "clipboard";

export default {
  name: "StorageList",
  data() {
    return {
      files: [],
      selected_dir: "",
      progress: 0,
    };
  },
  methods: {
    open_file_dialog() {
      document.getElementById("file").click();
    },
    upload_file(e) {
      let formData = new FormData();
      for (var i = 0; i < e.target.files.length; ++i)
        formData.append("file" + i, e.target.files[i]);

      api
        ._catch_and_then(
          axios.put(
            api.apiBase + "storage/" + this.selected_dir,
            formData,
            api._config({
              onUploadProgress: (e) => {
                this.progress = ((e.loaded * 100) / e.total) | 0;
              },
            })
          )
        )
        .then((data) => {
          this.progress = 0;
          for (var r of data.result)
            this.files.splice(this.selected_dir != "" ? 1 : 0, 0, r);
        });
    },
    file_link(f) {
      return "/api/storage/" + f.fullpath.split("/").slice(1).join("/");
    },
    update_files() {
      api.call("storage/" + this.selected_dir).then((data) => {
        this.files = data.result;
        if (this.selected_dir !== "")
          this.files.splice(0, 0, { name: "..", folder: true });
      });
    },
    copy_file_path(f) {
      return "sources" + f.fullpath;
    },
    enter(d) {
      if (d === "..")
        this.selected_dir = this.selected_dir.split("/").slice(0, -1).join("/");
      else
        this.selected_dir = this.selected_dir
          .split("/")
          .filter((x) => x)
          .concat(d)
          .join("/");
    },
  },
  mounted() {
    this.update_files();
    new Clipboard("button.copy");
  },
  watch: {
    selected_dir() {
      this.update_files();
    },
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  min-width: 300px;
  padding-right: 20px;
}

ol {
  list-style-type: none;
  padding: 0;
}

span.id::before {
  content: "ID: ";
}

.description {
  font-size: 12px;
}
</style>
