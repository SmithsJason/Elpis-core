import { createApp } from "vue";

//引入ElementUi
import ElementUi from 'element-plus';
import 'element-plus/theme-chalk/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import pinia from "$store";
import { createRouter, createWebHashHistory } from "vue-router";
import './assets/custom.css'

/**
 * vue 页面主入口，用于启动vue
 * @param pageComponent vue 入口组件
 * @param routers 路由列表
 * @param libs 页面依赖的第三方包
 */
export default (pageComponent, { routers = [], libs = [] } = {})=>{
    const app=createApp(pageComponent);
    
    //应用ElemntUI
    app.use(ElementUi);

    app.use(pinia);

    //引入第三方包
   if(libs&&libs.length)
    {
         for(let i=0;i<libs.length;i++)
        {
            app.use(libs[i]);
        }
   } 

    //页面路由
    if(routers&&routers.length){
        const router = createRouter({
            history: createWebHashHistory(),//采用hash模式
            routes: [],
        });
        app.use(router);
        router.isReady().then(()=>{
        app.mount('#root');
        })
    }
    else{
        app.mount('#root');
    }
}