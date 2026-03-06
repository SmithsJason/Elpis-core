const elpisCore = require('./elpis-core');

elpisCore.start({
    name: 'elpis',
    homePage: '/view/project-list', // 指定首页路径，给 '/' 和 404 兜底用
});