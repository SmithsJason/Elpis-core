module.exports = (app) => {
    const BaseService = require('./base')(app);
    const modelList =require('../../model/index.js')(app)
    return class projectService extends BaseService {
        /**
         * 获取统一模型下的项目列表
         */
        getList(projKey) {
           return modelList.reduce((preList,modelItem)=>{
                const {project} =modelItem;
                //如果有传projKey ，则只取当前模型下的项目，不传的情况下则取全量
                if(projKey && !project[projKey]){ return preList;}
                for(const pKey in project){
                     preList.push(project[pKey]);
                }
                return preList;
            }, [])
        }
        /**
         * 获取所有模型与项目的结构化数据
         */
        async getModelList() {
            return modelList;
        }
    }
}