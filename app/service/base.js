const superagent = require('superagent');
module.exports = (app) => {
    return class BaseService {
        /**
         * service 基类
         * 统一收拢 service 的公共方法
         */
        constructor() {
            // 这里的 app 来自模块外层的闭包，由 loader 传入
            this.app = app;
            this.config = app.config;
            this.curl = superagent;
        }
    }
}