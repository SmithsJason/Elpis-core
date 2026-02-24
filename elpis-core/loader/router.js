const KoaRouter = require('koa-router');
const glob = require('glob');
const path = require('path');
const { sep } = path;

/**
 * router loader
 * @param {object} app Koa 实例
 *
 * 解析 app/router 下所有 js 文件，加载到 KoaRouter 下
 */
module.exports = (app) => {
  // 1. 业务路由目录
  const routerPath = path.resolve(app.businessPath, `.${sep}router`);

  // 2. 实例化 KoaRouter，并挂到 app 上
  const router = new KoaRouter();
  app.router = router;

  // 3. 正确匹配 app/router/**.js
  const fileList = glob.sync(
    path.resolve(routerPath, `.${sep}**${sep}*.js`)
  );

  // 4. 加载所有路由文件：module.exports = (app, router) => { ... }
  fileList.forEach((file) => {
    require(path.resolve(file))(app, router);
  });

  // 5. 根路径重定向到首页
  router.get('/', async (ctx) => {
    ctx.status = 302; // 临时重定向
    ctx.redirect(app?.options?.homePage ?? '/view/page1');
  });

  // 6. 注册路由到 app 上
  app.use(router.routes());
  app.use(router.allowedMethods());
};