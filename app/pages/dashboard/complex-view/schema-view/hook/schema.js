import {ref,watch,onMounted, nextTick} from 'vue'
import {useRoute} from 'vue-router'
import {useMenuStore} from '$store/menu.js'

export const useSchema = function(){
    const route=useRoute();
    const menuStore=useMenuStore();

    const api=ref('');
    const tableSchema=ref({});
    const tableConfig=ref({});

    //构建schemmaConfig 相关配置，输送给schemaView组件
    const buildData=function(){
        const {key,sider_key:siderKey} = route.query;

        const mItem=menuStore.findMenuItem({
            key:'key',
            value:siderKey??key
        });
        if(mItem&&mItem.schemaConfig){
            const {schemaConfig:sConfig} = mItem;
            const configSchema=JSON.parse(JSON.stringify(sConfig.schema));
            api.value=sConfig.api??'';
            tableSchema.value={};
            tableConfig.value=undefined;
            nextTick(()=>{
                tableSchema.value=buildDtoSchem(configSchema,'table');
                tableConfig.value=sConfig.tableConfig;
            })
        }
    }
    //通用构建 schema 方法
    const buildDtoSchem=function(_schema,comName){
        if(!_schema?.properties){ return {}; }

        const dtoSchema={
            type:'object',
            properties:{}
        }
        //提取有效 schema 字段信息(清除噪音)
        for(const key in _schema.properties){
            const props = _schema.properties[key];
            if(!props[`${comName}Option`]<0){
                //提取props 中非 option 字段的部分，存放到dtoProps中
                let dtoProps={};
                for(const pKey in props){
                    if(pKey.indexOf('Option')<0){    
                        dtoProps[pKey]=props[pKey];
                    }
                }
                //处理 comName Option
                dtoProps = Object.assign({},dtoProps,{option:props[`${comName}Option`]});
                dtoSchema.properties[key]=dtoProps;
            }
        }
        return dtoSchema;
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
        api,
        tableSchema,
        tableConfig
    }
}