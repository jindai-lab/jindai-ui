<template>
  <div>
    <h3>任务
      <button class="mui-btn mui-btn--primary" @click="create_task()">
        <i class="fa fa-plus"></i> 新建任务
      </button></h3>
    <div>
      <ol>
        <li v-for="task in tasks" :key="task._id" class="mui-panel">
          <span class="name">{{ task.name }}</span>
          <span class="opers">
            <router-link
              :to="'/tasks/' + task._id"
              class="mui-btn mui-btn"
            >
              <i class="fa fa-edit"></i>
            </router-link>

            <button @click="duplicate_task(task)" class="mui-btn">
              <i class="fa fa-copy"></i>
            </button>

            <button
              @click="delete_task(task._id)"
              class="mui-btn mui-btn--danger"
            >
              <i class="fa fa-trash"></i>
            </button> </span
          ><br />
          <span class="id">{{ task._id }}</span>
        </li>
      </ol>
    </div>
  </div>
</template>

<script>
import api from "../api";

export default {
  data() {
    return {
      tasks: [],
    };
  },
  methods: {
    delete_task(id) {
      api.delete("tasks/" + id).then((resp) => {
        if (resp.data.result.ok)
          this.tasks = this.tasks.filter((x) => x._id != id);
      });
    },
    create_task() {
      api
        .put("tasks/", { name: "新建任务 " + new Date() })
        .then((resp) => this.$router.push("/tasks/" + resp.data.result));
    },
    duplicate_task(task) {
      var otask = Object.assign({}, task);
      otask._id = null;
      otask.name += " 复制";
      api
        .put("tasks/", otask)
        .then((resp) => this.$router.push("/tasks/" + resp.data.result));
    },
  },
  mounted() {
    api.call("tasks").then((resp) => (this.tasks = resp.data.result));
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  min-width: 300px;
}

span.name::before {
  content: "■ ";
  font-size: 20px;
}

ol {
  list-style-type: none;
  padding: 0;
}

span.id::before {
  content: "ID: ";
}
</style>