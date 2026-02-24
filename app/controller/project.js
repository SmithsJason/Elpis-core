module.exports = (app) => {
    const BaseController = require('./base')(app);
    return class projectController extends BaseController {
        /**
         * 获取所有模型与项目的结构化数据
         */
        async getModelList(ctx) {
            const { project: projectService } = app.service;
            const modelList = await projectService.getModelList();
            // 构造返回结果，只返回关键数据
            const dtoModelList=modelList.reduce((preList,item)=>{
                const {model,project} =item;
                //构造 model 关键数据
                const {key,name,desc} =model
                const dtoModel={key,name,desc};
                //构造 project 关键数据
                const dtoProject=Object.keys(project).reduce((preObj,projKey)=>{
                    const {key,name,desc,homepage} =project[projKey];
                    preObj[projKey]={key,name,desc,homepage};
                    return preObj;
                },{})
                preList.push({
                    model:dtoModel,
                    project:dtoProject
                });
                return preList;
            },[])
            this.success(ctx, dtoModelList);
        }
    }
}