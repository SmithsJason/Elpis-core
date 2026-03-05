<template>
    <headerContainer :title="projName">
        <template #menu-content>
            <!--根据 menuStore中的menuList渲染-->
            <el-menu 
            :default-active="activeKey"
            :ellipsis="false"
            mode="horizontal"
            @select="onSelect">
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
    </headerContainer>
</template>
<script setup>
import {ref} from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import headerContainer from '$widgets/header-container/header-container.vue';
import SubMenu from './sub-menu/sub-menu.vue';
import {useProjectStore} from '$store/project.js';
import {useMenuStore} from '$store/menu.js';
defineProps({
    projName: {
        type: String,
        default: '项目列表'
    }
})
const projectStore=useProjectStore();
const menuStore=useMenuStore();
const activeKey=ref('');
function onSelect(key) {
    activeKey.value=key;
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