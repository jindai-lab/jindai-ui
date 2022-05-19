<template>
  <div>
    <QueryFormulator v-model="test" />
    <pre v-text="test"></pre>
  </div>
</template>

<script>
import QueryFormulator from "../components/QueryFormulator.vue";
export default {
  name: "QueryFormTest",
  components: {
    QueryFormulator,
  },
  data: () => ({ test: "" }),
};
</script>
