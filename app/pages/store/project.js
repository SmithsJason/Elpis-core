import { defineStore } from "pinia";
import {ref} from "vue";
export const useProjectStore = defineStore('project',()=>{
    //项目列表
    const projectList=ref([]);
    //项目配置
    const projectConfig=ref({});
    //设置项目列表
    const setProjectList=(list)=>{
        projectList.value=list;
    }
    //设置项目配置
    const setProjectConfig=(config)=>{
        projectConfig.value=config;
    }
    return {
        projectList,
        projectConfig,
        setProjectList,
        setProjectConfig
    }
})