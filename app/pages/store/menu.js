import { defineStore } from "pinia";
import {ref} from "vue";
export const useMenuStore = defineStore('menu',()=>{
    //菜单列表
    const menuList=ref([]);
    //设置菜单列表
    const setMenuList=(list)=>{
        menuList.value=list;
    }
    return {
        menuList,
        setMenuList
    }
})