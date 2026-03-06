<template>
  <el-sub-menu :index="menuItem.key">
    <template #title>
      <span>{{ menuItem.name }}</span>
    </template>
    <div :key="item.key" v-for="item in menuItem.subMenu" >
      <sub-menu v-if="item.subMenu&&item.subMenu.length>0" :menuItem="item"></sub-menu>
     <el-menu-item v-else :index="item.key">{{ item.name }}</el-menu-item>
    </div>
  </el-sub-menu>
</template>
<script setup>
const {menuItem} =defineProps({
    menuItem: {
        type: Object,
        default: () => ({}),
    }
})
</script>
<style lang="less" scoped>

</style>