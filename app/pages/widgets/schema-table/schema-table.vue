<template>
    <div class="schema-table">
        <el-table class="table"></el-table>
        <el-row class="pagination">
        <el-pagination></el-pagination>
        </el-row>
    </div>
</template>
<script setup>
import {ref,toRefs,computed,watch,nextTick,onMounted} from 'vue';
import $curl from '$common/curl';
const props=defineProps({
    /**
     * schema 配置，结构如下:
     * {
     *    type:'object',
     *    properties:{
     *       key:{
     *          ...schema,//标准 schema 配置
     *          type:''//字段类型
     *          label:''//字段名称
     *          option:{
     *             ...elTableColumnConfig.//标准 el-table-column 配置
     *             visible: true//默认为显示 true (false 或不配置时，标识不在表单中显示)
     *          },
     *       },
     *       ...
     * }
     */
    schema:Object,
    /**
     * 表格数据源 api
     */
    api:String,
    /**
     * buttons 操作按钮相关配置，结构如下:
     * {
     *   label:''.//按钮名称
     *   eventKey:''.//按钮事件名
     *   eventOptions:{}//按钮事件具体配置
     *   ...elButtonConfig //标准 el-button 配置
     * }
     */
    buttons:Array
})
const {schema,api,buttons}=toRefs(props);

const loading=ref(false);
const tableData=ref([]);
const total=ref(0);
const page=ref(1);
const pageSize=ref(50);

const fetchData=async function(){
    if(!api.value){ return; }
    loading.value=true;
    try{
        const res=await $curl.get(api.value,{
            params:{
                page:page.value,
                pageSize:pageSize.value
            }
        });
        if(res&&res.data){
            tableData.value=res.data.list??[];
            total.value=res.data.total??0;
        }
    }finally{
        loading.value=false;
    }
}
const initData=async function(){
    page.value=1;
    pageSize.value=50;
    nextTick(async ()=>{
        await fetchData();
    })
}
</script>
<style lang="less" scoped>
.schema-table{
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow:auto;
    .table{
        flex:1;
    }
    .pagination{
        margin: 10px 0;
        text-align: center;
    }
}
</style>
