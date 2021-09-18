<template>
  <div>
    <h3>工作流
      <button class="mui-btn mui-btn--primary" @click="create_task()">
        <font-awesome-icon icon="plus" /> 新建
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
              <font-awesome-icon icon="edit" />
            </router-link>

            <button @click="duplicate_task(task)" class="mui-btn">
              <font-awesome-icon icon="copy" />
            </button>

            <button class="mui-btn" @click="delete_task(task)">
              <font-awesome-icon icon="trash" />
            </button>
             </span
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
    create_task() {
      api
        .put("tasks/", { name: "新建工作流 " + new Date() })
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
    delete_task(task) {
      api.delete("tasks/" + task._id).then(() => this.tasks = this.tasks.filter((x) => x._id != task._id))
    }
  },
  mounted() {
    api.call("tasks/0/100").then((data) => (this.tasks = data.result));
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  padding-right: 20px;
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
