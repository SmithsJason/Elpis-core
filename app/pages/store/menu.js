import { defineStore } from "pinia";
import {ref} from "vue";
export const useMenuStore = defineStore('menu',()=>{
    //菜单列表
    const menuList=ref([]);
    //设置菜单列表
    const setMenuList=(list)=>{
        menuList.value=list;
    }
    /**
     * 找出菜单列表
     * @param key 搜索字段
     * @param value 搜索值
     * @param mlist 要搜索的菜单列表
     */
    const findMenuItem=function({key,value},mList=menuList.value){
        for(let i=0;i<mList.length;i++){
            const menuItem = mList[i];
            if(!menuItem){ continue; }
            const {menuType,moduleType}=menuItem;
            if(menuItem[key]===value){
                return menuItem;
            }
            if(menuType==='group'&& menuItem.subMenu){
                const mItem = findMenuItem({key,value},menuItem.subMenu);
                if(mItem){  return mItem;  }
            }
            if(menuType==='module'&&moduleType==='sider'&&menuItem.siderConfig&&menuItem.siderConfig.menu){
                const mItem = findMenuItem({key,value},menuItem.siderConfig.menu);
                if(mItem){  return mItem;  }
            }
        }
    }
    return {
        menuList,
        setMenuList,
        findMenuItem
    }
})