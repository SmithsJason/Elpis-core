<template>
<headerContainer title="项目列表">
    <template #main-content>
            <div v-loading="loading">
                <div v-for="item in modelList" :key="item.model?.key">
                    <!--展示model-->
                    <div class="model-panel">
                        <el-row flex align="middle">
                            <div class="title">{{item.model?.name}}</div>
                        </el-row>
                        <div class="divider"></div>
                    </div>
                    <!--展示project-->
                    <el-row flex class="project-list">
                        <el-card
                        v-for= "(projItem, projKey) in item.project" 
                        :key="projKey" 
                        class="project-card">
                    <template #header>
                        <div class="title">
                            <sapn>{{projItem.name}}</sapn>
                        </div>
                    </template>
                    <div class="content">
                       {{projItem.desc??'暂无描述'}}
                    </div>
                    <template #footer>
                       <el-row justify="end">
                        <el-button link type="primary" @click="onEnter(projItem)">进入</el-button>
                       </el-row>
                    </template>
                </el-card>
                    </el-row>
                </div>
            </div>
    </template>
</headerContainer>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import $curl from '$common/curl.js';
import headerContainer from '$widgets/header-container/header-container.vue';
const loading=ref(false);
const modelList=ref([]);
async function getModelList(){
    loading.value=true;
   const res=await $curl({
    method:'get',
    url:'/api/project/model_list',
    errorMessages: '获取模型列表失败'
   });
   loading.value=false;
   if(!res||!res.success||!res.data){
    return;
   }
   modelList.value=res.data;
   console.log(modelList.value);
}
onMounted(()=>getModelList());
const onEnter=(projItem)=>{
    console.log(`跳转到${projItem.name}`);
}
</script>
<style lang="less" scoped>
.model-panel{
    margin: 20px 50px;
    min-width: 500px;
    .title{
        font-size: 25px;
        font-weight: bold;
        color:#e5e5e5;
    }
    .divider{
        margin-top: 10px;
        border-bottom: 1px dashed #d7d7d7;
        width: 200px;
    }
}
.project-list{
    margin: 0 50px;
    .project-card{
        margin-right: 30px;
        margin-bottom: 20px;
        width: 300px;
        .title{
            font-size: 18px;
            font-weight: bold;
            color: #47a2ff;
        }
        .content{
            height: 70px;
            font-size: 15px;
            color: darkgray;
            overflow: hidden;
        }
    }
}
</style>