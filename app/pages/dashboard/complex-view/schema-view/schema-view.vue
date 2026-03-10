<template>
   <el-row class="schema-view">
        <search-panel></search-panel>
        <table-panel></table-panel>
   </el-row>
</template>
<script setup>
import SearchPanel from './complex-view/search-panel.vue';
import TablePanel from './complex-view/table-panel.vue';
import {provide} from 'vue';
import {useSchema} from './hook/schema.js';
const {api,tableConfig,tableSchema} = useSchema();
provide('schemaViewData',{
   api,
   tableConfig,
   tableSchema
})
</script>
<style lang="less" scoped>
.schema-view{
   display: flex;
   flex-direction: column;
   height: 100%;
   width: 100%;
}
</style>