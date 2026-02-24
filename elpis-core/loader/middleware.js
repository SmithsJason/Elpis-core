const glob=require('glob');
const path=require('path');
const {sep} =path;
/**
 * middleware loadeer
 * @param {object} app Koa实例
 * 
 * 加载所有middleware，可通过‘app.middleware.${目录}.${文件}' 访问
 *
    eg:
    app/middleware
      |
      | --custom-module
            |
            | -- custom-middleware.js
    =>app.middleware.customModule.customMiddleware
 */

module.exports=(app)=>{
    // 读取 app/middlewares/**/**.js 下的所有文件
    const middlewarePath=path.resolve(app.businessPath,`.${sep}middlewares`)
    const fileList=glob.sync(path.resolve(middlewarePath,`.${sep}**${sep}**.js`))

    //遍历所有文件目录，把内容加载到 app.middlewares下
    //这里要注意的是，如果使用middleware的话会跟koa内置的中间件命名冲突
    const middlewares={};
    fileList.forEach(file => {
        //提取文件名称
        let name=path.resolve(file);
        //截取路径 app/middlewares/custom-module/custom-middleware.js => custom-module/custom-middleware.js
        name=name.substring(name.lastIndexOf(`middlewares${sep}`)+`middlewares${sep}`.length,name.lastIndexOf('.'))
        //把‘-’统一改成驼峰式，custom-module/custom-middleware.js =>customModule/customMiddleware.js
        name=name.replace(/[_-][a-z]/ig,(s)=> s.substring(1).toUpperCase())
        //挂在middlewares到内存app对象中  
        let temMiddleware=middlewares;
        const names=name.split(sep)
        for(let i=0,len=names.length;i<len;i++){
            if(i==len-1)
                {
                    temMiddleware[names[i]]=require(path.resolve(file))(app);
            }
            else{
                if(!temMiddleware[names[i]]){
                    temMiddleware[names[i]]={};
                }
                temMiddleware=temMiddleware[names[i]];
            }
        } 
    });
    app.middlewares=middlewares
}