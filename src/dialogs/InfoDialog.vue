<template>
    <v-dialog v-model="visible">
      <v-card>
        <v-card-title>
          <v-btn
            icon
            @click="close"
            style="margin-right: 12px"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
          {{ $t("metadata") }}
        </v-card-title>
        <v-card-text>
          <v-data-table
            :items="
              Object.entries(target || {}).map((v) => ({
                value:
                  typeof v[1] !== 'object'
                    ? v[1]
                    : JSON.stringify(v[1], null, 2),
                key: v[0],
              }))
            "
            :headers="[{ value: 'key' }, { value: 'value' }]"
            hide-default-header
          >
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
        }
    }
})
</script>
