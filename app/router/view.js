module.exports = (app, router) => {
    const { view: ViewController } = app.controller;
    // 用户输入 http://ip:port/view/page1 会渲染 output/entry.page1.tpl 页面
    router.get('/view/:page', ViewController.renderPage.bind(ViewController));
  };