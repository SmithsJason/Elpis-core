import boot from '$pages/boot.js';
import dashboard from './dashboard.vue';
const routers=[];
//头部菜单路由
routers.push({
    path: '/iframe',
    component: () => import('./complex-view/iframe-view/iframe-view.vue'),
});
routers.push({
    path: '/schema',
    component: () => import('./complex-view/schema-view/schema-view.vue'),
});
routers.push({
    path: '/todo',
    component: () => import('./todo/todo.vue'),
});
//侧边菜单路由 这是头部菜单的子路由
routers.push({
    path: '/sider',
    component: () => import('./complex-view/sider-view/sider-view.vue'),
    children:[{
        path: 'iframe',
        component: () => import('./complex-view/iframe-view/iframe-view.vue'),
    },{
        path: 'schema',
        component: () => import('./complex-view/schema-view/schema-view.vue'),
    },{
        path: 'todo',
        component: () => import('./todo/todo.vue'),
    }]
});
//侧边导航兜底策略
routers.push({
    path: '/sider/:chapptes',
    component: () => import('./complex-view/sider-view/sider-view.vue'),
});
boot(dashboard, { routers });