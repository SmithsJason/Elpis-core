const path = require('path');
const koaStatic = require('koa-static');
const koaNunjucks = require('koa-nunjucks-2');
const bodyParser = require('koa-bodyparser');
module.exports = (app) => {
    //配置静态资源目录
    app.use(koaStatic(path.resolve(process.cwd(), './app/public')));
   //模版渲染引擎
   app.use(koaNunjucks({
    ext: 'tpl',
    path: path.resolve(process.cwd(), './app/public'),
    nunjucksConfig: {
        noCache: true,
        trimBlocks: true,
    },
   }));
   //引入ctx.body 解析中间件
   app.use(bodyParser({
    formLimit: '1000mb',
    enableTypes: ['json', 'form', 'text'],
   }));
   //引入 API 签名校验中间件
    app.use(app.middlewares.apiSignVerify);
   //引入异常捕获中间件
   app.use(app.middlewares.errorHandle);
   //引入参数校验
   app.use(app.middlewares.apiParamsVerify);
};


