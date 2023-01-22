<template>
  <v-dialog v-model="visible">
    <v-card>
      <v-card-title>
        <v-btn icon @click="close" style="margin-right: 12px">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        {{ $t("metadata") }}
      </v-card-title>
      <v-card-text>
        <v-data-table :items="
          Object.entries(target || {}).map(v => ({ key: v[0], value: v[1] }))
        " :headers="[{ value: 'key' }, { value: 'value' }]" hide-default-header>
          <template v-slot:item.value="{ item }">
            <div :class="(typeof item.value == 'object' || ('' + item.value).match(/\s/)) ? 'code' : ''">{{
              render_text(item.value)
            }}</div>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="close"> {{ $t("ok") }} </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>

export default ({
  name: 'InfoDialog',
  props: ['target', 'retval'],
  data: (() => ({
    visible: true
  })),
  methods: {
    close() {
      this.visible = false
      this.retval = true
    },
    render_text(obj) {
      if (typeof obj !== 'object') return '' + obj
      var prefix = 'Object'
      if (Array.isArray(obj)) prefix = `<${obj.length} items>`
      return prefix + '\n' + JSON.stringify(obj, null, 2)
    }
  }
})
</script>

<style scoped>
.code {
  white-space: pre-line;
  max-height: 200px;
  overflow-y: auto;
}
</style>
