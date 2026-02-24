module.exports = (app) => {
    const BaseService = require('./base')(app);
    const modelList =require('../../model/index.js')(app)
    return class projectService extends BaseService {
        /**
         * 获取所有模型与项目的结构化数据
         */
        async getModelList() {
            return modelList;
        }
    }
}