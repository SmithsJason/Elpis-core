const Koa = require('koa');
const path = require('path');
const {sep} = path;
const env = require('./env');
const middlewareLoader = require('./loader/middleware');
const routerSchemaLoader = require('./loader/router-schema');
const routerLoader = require('./loader/router');
const controllerLoader = require('./loader/controller');
const serviceLoader = require('./loader/service');
const configLoader = require('./loader/config');
const extendLoader = require('./loader/extend');
module.exports = {
    /**
     * 启动项目
     * @param {Object} options - 启动配置
     *  - listen: 是否在调用时立即监听端口，默认 true
     *  - port: 指定监听端口，默认使用 process.env.PORT 或 8080
     */
    start: (options = {}) => {
        //koa实例
        const app = new Koa();
        //应用配置
        app.options = options;
        //基础路径
        app.baseDir = process.cwd();
        //业务路径
        app.businessPath = path.resolve(app.baseDir, `.${sep}app`);
        //初始化环境配置
        app.env = env(app);
        // 先加载 config，保证后续 loader 与 controller 中可以安全访问 app.config
        configLoader(app);
        console.log(app.config);
        console.log(`--start: configLoader`);

        // 加载 middlewares
        middlewareLoader(app);
        console.log('done');

        // 加载 router-schema
        routerSchemaLoader(app);
        console.log(app.routerSchema);
        console.log(`--start: routerSchemaLoader`);
        
        // 加载 controller
        controllerLoader(app);
        console.log(app.controller);
        console.log(`--start: controllerLoader`);

        // 加载 service
        serviceLoader(app);
        console.log(app.service);
        console.log(`--start: serviceLoader`);

        // 加载 extend
        extendLoader(app);
        console.log(app.extend);
        console.log(`--start: extendLoader`);

        //注册全局中间件
        //app/middleware.js
        try{
            require(`${app.businessPath}${sep}middleware.js`)(app);
        }catch(e){
            console.log(`[exception] there is no middleware file.`)
        }

        //注册路由
        routerLoader(app);
        console.log(app.router);
        console.log(`--start: routerLoader`);

        //启动服务（测试场景可通过 options.listen === false 禁用监听）
        const shouldListen = options.listen !== false;
        if (shouldListen) {
            try {
                const port = options.port || process.env.PORT || 8080;
                app.listen(port);
            } catch (error) {
                console.error(error.message);
                process.exit(1);
            }
        }
        return app;
    }
}
