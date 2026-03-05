<template>
    <el-config-provider :locale="zhCn">
         <headerView :projName="projName"></headerView>
    </el-config-provider>
 
</template>
<script setup>
import { ref,onMounted } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import headerView from './complex-view/header-view/header-view.vue';
import $curl from '$common/curl.js';
import { useProjectStore } from '$store/project.js';
import { useMenuStore } from '$store/menu.js';
const projectStore=useProjectStore();
const menuStore=useMenuStore();
onMounted(() => {
    getProjectList();
    getProjectConfig();
});
const projName=ref('');
//请求project接口，获取项目配置（含name和menu）
async function getProjectConfig() {
    const res=await $curl({
        method:'get',
        url:'/api/project',
        //todo：动态获取 暂时写死
        query:{proj_key:'pdd'},
    });
    if(!res||!res.success||!res.data){
        return;
    }
    const {name,menu}=res.data;
    projName.value=name;
    menuStore.setMenuList(menu);
    projectStore.setProjectConfig(res.data);
}
//请求projectlist接口，获取项目列表
async function getProjectList() {
    const res=await $curl({
        method:'get',
        url:'/api/project/list',
        //todo：动态获取 暂时写死
        query:{proj_key:'pdd'},
    });
    if(!res||!res.success||!res.data){
        return;
    }
    projectStore.setProjectList(res.data);
}
</script>
<style lang="less" scoped>

</style>