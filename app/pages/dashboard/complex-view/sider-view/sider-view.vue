<template>
   <sider-contanier>
      <template #menu-content>
      <el-menu :default-active="activeKey" :elipsis="false" @select="onMenuSelect">
         <template v-for="item in menuList" :key="item.key">
            <sub-menu v-if="item.subMenu&&item.subMenu.length>0" :menuItem="item"></sub-menu>
            <el-menu-item v-else :index="item.key">{{ item.name }}</el-menu-item>
        </template>
      </el-menu>
      </template>
      <template #main-container>
        <router-view></router-view>
      </template>
   </sider-contanier>
</template>
<script setup>
import {ref,watch,onMounted} from 'vue';
import { useRoute,useRouter } from 'vue-router';
import {useMenuStore} from '$store/menu.js';
import SiderContanier from '$widgets/sider-contanier/sider-contanier.vue';
import SubMenu from './complex-view/sub-menu/sub-menu.vue';

const route = useRoute();
const router = useRouter();
const menuStore = useMenuStore();

const menuList = ref([]);
const setMenuList = function () {
   const menuItem = menuStore.findMenuItem({
      key: 'key',
      value: route.query.key
   });
   if (menuItem&&menuItem.siderConfig&&menuItem.siderConfig.menu) {
      menuList.value = menuItem.siderConfig.menu;
   }
}

const activeKey = ref('');
const setActiveKey = function () {
   let siderMenuItem = menuStore.findMenuItem({
      key: 'key',
      value: route.query.key
   });
   //如果首次加载sider-view，用户未选中左侧菜单，需要确认选中第一个
   if(!siderMenuItem){
      const hMenuItem = menuStore.findMenuItem({
         key: 'key',
         value: route.query.key
      });
      if (hMenuItem&&hMenuItem.siderConfig&&hMenuItem.siderConfig.menu) {
         const siderMenuList = hMenuItem.siderConfig.menu;
         siderMenuItem = menuStore.findFirstMenuItem(siderMenuList);
         //处理选中逻辑
         if(!siderMenuItem){
          handleMenuSelect(siderMenuItem.key);
         }
      }
   }
}


watch(() => route.query.key, () => {
    setActiveKey();
});
watch(() => menuStore.menuList, () => {
    setMenuList();
});

onMounted(() => {
   setMenuList();
   setActiveKey();
});

const onMenuSelect = function (menuKey) {
   handleMenuSelect(menuKey);
}
const handleMenuSelect = function (menuKey) {
   const menuItem = menuStore.findMenuItem({
      key: 'key',
      value: menuKey
   });
   const {moduleType,key,customConfig } = menuItem;
   //如果是当前页面，不跳转
   if(key===route.query.sider_key){return;}
   const pathMap={
      iframe:'/iframe',
      schema:'/schema',
      custom:customConfig?.path
   }
   router.push({
      path:`/sider${pathMap[moduleType]}`,
      query:{
         key:route.query.key,
         sider_key:menuKey,
         proj_key:route.query.proj_key
      }
   })
}
</script>
<style lang="less" scoped>

</style>