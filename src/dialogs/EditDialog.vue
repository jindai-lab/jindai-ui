<template>

  <v-dialog v-model="visible">
    <v-card v-if="target">
      <v-card-title>{{ $t("edit-paragraph") }} {{ target._id }}
        <v-spacer></v-spacer>
        <v-btn icon @click="visible = false; $emit('input', target)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="(field, key) in target" :key="key">
            <v-list-item-content>
              <ParamInput v-model="target[key]" :arg="{ type: typeof field, name: key, default: '\'\'' }" v-if="
                !(
                  ['_id', 'matched_content'].includes(key) ||
                  typeof field == 'object'
                )
              " />
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <ParamInput v-model="new_field" :arg="{ type: 'string', name: $t('new-field'), default: '' }" />
              <v-btn @click="target?.set(new_field, '')">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="$emit('input', target)">{{ $t("save") }}</v-btn>
        <v-btn @click="visible = false">{{
          $t("cancel")
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { UIParagraph } from "@/api";
import ParamInput from "@/components/ParamInput.vue"

import { defineComponent } from "vue";

export default defineComponent({
  name: 'EditDialog',
  components: { ParamInput },
  data: () => ({ visible: true, new_field: '' }),
  props: {
    target: {
      type: UIParagraph
    }
  },
  watch: {
    visible() {
      this.$emit('input', false)
    }
  }
})
</script>