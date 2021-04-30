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
      if (!confirm('确实要删除吗？')) return
      api.delete("tasks/" + id).then((data) => {
        if (data.result.ok)
          this.tasks = this.tasks.filter((x) => x._id != id);
      });
    },
    create_task() {
      api
        .put("tasks/", { name: "新建任务 " + new Date() })
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
    duplicate_task(task) {
      var otask = Object.assign({}, task);
      otask._id = null;
      otask.name += " 复制";
      api
        .put("tasks/", otask)
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
  },
  mounted() {
    api.call("tasks/").then((data) => (this.tasks = data.result));
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  min-width: 300px;
}

ol {
  list-style-type: none;
  padding: 0;
}

span.id::before {
  content: "ID: ";
}
</style>
