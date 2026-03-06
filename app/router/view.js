module.exports = (app, router) => {
    const { view: ViewController } = app.controller;
    // 用户输入 http://ip:port/view/project-list 会渲染 output/entry.project-list.tpl 页面
    router.get('/view/:page', ViewController.renderPage.bind(ViewController));
  };