<template>
  <v-dialog v-model="visible">
    <v-card>
      <v-card-title>
        {{ $t("send-task") }}
        <v-spacer></v-spacer>
        <v-btn
          icon
          @click="
            visible = false;
            retval = false;
          "
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="mt-5">
        <v-row>
          <v-col>
            <v-autocomplete
              dense
              :label="$t('send-to')"
              :items="quicktasks"
              v-model="pipeline"
            ></v-autocomplete>
            <v-btn color="primary" dense @click="$refs.quicktask_results.start(1)">
              <v-icon>mdi-fast-forward</v-icon> {{ $t("run-now") }}
            </v-btn>
          </v-col>
        </v-row>
        <v-sheet>
          <ResultsView :load="quicktask" ref="quicktask_results" />
        </v-sheet>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import ResultsView from "../components/ResultsView.vue";
export default {
  name: "SendTaskDialog",
  props: ["selection", "retval"],
  components: { ResultsView },
  data: () => ({
    visible: true,
    results_count: 0,
    pipeline: [],
    quicktasks: [],
  }),
  mounted() {
    this.api.call("tasks/shortcuts").then(
      (data) =>
        (this.quicktasks = data.result.map((task) => ({
          text: task.name,
          value: task.pipeline,
        })))
    );
  },
  methods: {
    quicktask() {
      return this.api
        .call("quicktask", {
          pipeline: [
            [
              "JSONDataSource",
              {
                content: JSON.stringify(
                  this.selection.paragraphs.map((x) =>
                    Object.assign({}, x, { matched_content: null })
                  )
                ),
              },
            ],
            ...this.pipeline,
          ],
        })
        .then((data) => {
          return {
            result: data.result,
            offset: 0,
            total: data.result.length,
            token: new Date().getTime(),
          };
        });
    },
  },
};
</script>
