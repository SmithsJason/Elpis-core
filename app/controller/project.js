module.exports = (app) => {
    const BaseController = require('./base')(app);
    return class projectController extends BaseController {
        /**
         * 根据 projectKey 获取项目配置
        */
        get(ctx){
            const { proj_key: projKey } = ctx.request.query;
            const { project: projectService } = app.service;
            const projConfig =  projectService.get(projKey);
            if(!projConfig){
                this.fail(ctx, '项目不存在');
                return;
            }
            this.success(ctx, projConfig);
        }
        /**
         * 
         * 获取当前 projectKey 对应模型下的项目列表 （如果无projectKey 全量获取）
         */
        getList(ctx) {
            const { proj_key: projKey } = ctx.request.query;
            const { project: projectService } = app.service;
            const projectList = projectService.getList(projKey);
            //构造关键数据list
            const dtoProjectList=projectList.map(item=>{
                const {modelKey,key,name,desc,homepage} =item;
                return {
                    modelKey,
                    key,
                    name,
                    desc,
                    homepage
                }
            })
            this.success(ctx, dtoProjectList);
        }
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