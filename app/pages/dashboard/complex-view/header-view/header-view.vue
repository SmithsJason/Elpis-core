<template>
    <header-container :title="projName">
        <template #menu-content>
            <!--根据 menuStore中的menuList渲染-->
            <el-menu 
            :default-active="activeKey"
            :ellipsis="false"
            mode="horizontal"
            @select="onMenuSelect">
        <template v-for="item in menuStore.menuList" :key="item.key">
            <SubMenu v-if="item.subMenu&&item.subMenu.length>0" :menuItem="item"></SubMenu>
            <el-menu-item v-else :index="item.key">{{ item.name }}</el-menu-item>
        </template>
        </el-menu>
        </template>
        <template #setting-content>
            <!-- projectStore中的projectList渲染-->
             <el-dropdown @command="handleProjectCommand">
                <span class="project-list">{{projName}}
                <el-icon v-if="projectStore.projectList.length>1" class="el-icon-right"><ArrowDown/></el-icon>
                </span>
                <template v-if="projectStore.projectList.length>1" #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item v-for="item in projectStore.projectList"
                         :key="item.key"
                         :command="item.key"
                         :disabled="item.name===projName">{{ item.name }}</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </template>
        <template #main-content>
            <slot name="main-content"></slot>
        </template>
    </header-container>
</template>
<script setup>
import {ref,watch,onMounted} from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import {useRoute} from 'vue-router';
import HeaderContainer from '$widgets/header-container/header-container.vue';
import SubMenu from './sub-menu/sub-menu.vue';
import {useProjectStore} from '$store/project.js';
import {useMenuStore} from '$store/menu.js';
defineProps({
    projName: {
        type: String,
        default: '项目列表'
    }
})
const emit=defineEmits(['menu-select']);
const route=useRoute();
const projectStore=useProjectStore();
const menuStore=useMenuStore();
const activeKey=ref('');

watch(()=>route.query.key, ()=>{setActiveKey()});

watch(()=>menuStore.menuList, ()=>{setActiveKey()});

onMounted(()=>{setActiveKey()});

const setActiveKey=()=>{
    const menuItem=menuStore.findMenuItem({
        key:'key',
        value: route.query.key
    });
    activeKey.value=menuItem?.key;
}

const onMenuSelect = function(menuKey){
    const menuItem=menuStore.findMenuItem({
        key:'key',
        value: menuKey
    });
    emit('menu-select', menuItem);
}
const handleProjectCommand = function(projectKey){
    const projectItem=projectStore.projectList.find(item =>item.key===projectKey);
    if(!projectItem || !projectItem.homePage){
        return;}
    const {origin, pathname} = window.location;
    window.location.replace(`${origin}${pathname}#${projectItem.homePage}`);
    window.location.reload();
}
</script>
<style lang="less" scoped>
:deep(.el-menu--horizontal.el-menu){
    border-bottom: 0;
}
:deep(.el-menu--horizontal){
   height: auto;
}
.project-list{
    margin-right: 20px;
    cursor: pointer;
    color: var(--el-color-primary);
    display: flex;
    align-items: center;
}
</style>