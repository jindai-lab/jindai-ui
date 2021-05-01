<template>
  <div>
    <h3>文件
      <button class="mui-btn mui-btn--primary" @click="open_file_dialog()">
        <i class="fa fa-upload"></i> 上传文件
      </button></h3>
      <input type="file" value="" id="file" @change="upload_file" hidden>
    <div>
      <ol>
        <li v-for="f in files" :key="f" class="mui-panel">
          <span class="name">{{ f }}</span>
          <span class="opers">
            
            <a class="mui-btn" :href="file_link(f)">
              <i class="fa fa-download"></i>
            </a>
             </span
          >
        </li>
      </ol>
    </div>
  </div>
</template>

<script>
import api from "../api";

export default {
  name: 'StorageList',
  data() {
    return {
      files: [],
    };
  },
  methods: {
    open_file_dialog() {
      document.getElementById('file').click()
    },
    upload_file(e) {
      let formData = new FormData();
      formData.append('file', e.target.files[0]);
      let config = {
        headers:{'Content-Type':'multipart/form-data'}
      };
      api.put('storage/', formData, api._config(config)).then((data) => {
        console.log(data.result)
        for (var r of data.result)
          this.files.push(r)
      })
    },
    file_link(f) {
      return api.file_url(f)
    }
  },
  mounted() {
    api.call("storage/").then((data) => (this.files = data.result));
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
</style>
