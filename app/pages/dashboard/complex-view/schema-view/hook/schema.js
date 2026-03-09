import {ref,watch,onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {useMenuStore} from '$store/menu.js'

export const useSchema = function(){
    const route=useRoute();
    const menuStore=useMenuStore();

    const api=ref('');

    //构建schemmaConfig 相关配置，输送给schemaView组件
    const buildData=function(){
        const {key,sider_key:siderKey} = route.query;

        const mItem=menuStore.findMenuItem({
            key:'key',
            value:siderKey??key
        });
        if(mItem&&mItem.schemaConfig){
            const {schemaConfig:sConfig} = mItem;
            api.value=sConfig.api??'';
        }
    }
    watch([
        ()=>route.query.key,
        ()=>route.query.sider_key,
        ()=>menuStore.menuList
    ],()=>{
        buildData()
    },{deep:true});
    onMounted(()=>{
        buildData();
    })
    return {
        api
    }
}