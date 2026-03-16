<template>
  <el-card class="table-panel">
    <!-- operation-panel-->
     <!--schema-table (组件 widget)-->
     <schema-table
     :schema="schemaTableRef"
     :api="api"
     :buttons="tableConfig?.rowButtons??[]"
     @operate="operatationHandle"> </schema-table>
  </el-card>

</template>
<script setup>
import {ref,inject} from 'vue'
import { ElMessageBox,ElNotification } from 'element-plus';
import $curl from '$common/curl.js'
import SchemaTable from '$widgets/schema-table/schema-table.vue'
const emit=defineEmits(['operate'])
const {
  api,
  tableConfig,
  tableSchema
}=inject('schemaTableData')
const schemaTableRef=ref(null)
const EventHanlerMap={
  remove:removeData
}
const operatationHandle=({btnConfig,rowData})=>{
  const {eventKey}=btnConfig
  if(EventHanlerMap[eventKey]){
  EventHanlerMap[eventKey]({btnConfig,rowData})
 }else{
  emit('operate',{btnConfig,rowData})
 }
}
const removeData=async ({btnConfig,rowData})=>{
  const {eventOptions}=btnConfig;
  if(!eventOptions?.params){
    return;
  }
  const params=eventOptions.params;
  let removeKey=Object.keys(params)[0];
  let removeValue=params[removeKey];
  const removeValueList=removeValue.split('::')
  if(removeValueList[0]==='schema'&&removeValueList[1]){
    removeValue=rowData[removeValueList[1]]
  }
  try{
    await ElMessageBox.confirm(`确定要删除${removeKey}为：${removeValue}数据吗？`,'warning',{
      confirmButtonText:'确定',
      cancelButtonText:'取消',
      type:'warning'
    })
    schemaTableRef.value.showLoading()
    const res=await $curl({
      method:'get',
      url:api.value,
      data:{
        [removeKey]:removeValue
      },
      errorMessage:`删除失败`
    })
    schemaTableRef.value.hideLoading()
    if(res&&res.success){
      ElNotification({
        title:'删除成功',
        message:'删除成功',
        type:'success'
      })
      await loadTableData()
    }
  }catch(e){
    schemaTableRef.value?.hideLoading()
  }
  }
  const loadTableData= async()=>{
    await schemaTableRef.value.loadTableData()
  }
  defineExpose({
    loadTableData
  })
</script>
<style lang="less" scoped>
.table-panel{
  flex: 1;
  margin-right: 20px;
}
</style>