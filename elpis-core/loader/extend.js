const glob=require('glob');
const path=require('path');
const {sep} =path;
/**
 * extend loadeer
 * @param {object} app Koa实例
 * 
 * 加载所有extend，可通过‘app.extend.${文件}' 访问
 *
    eg:
    app/extend
      |
      | --custom-extend
            |
            | -- custom-extend.js
    =>app.extend.customExtend
 */

module.exports=(app)=>{
    // 读取 app/extend/**.js 下的所有文件
    const extendPath=path.resolve(app.businessPath,`.${sep}extend`)
    const fileList=glob.sync(path.resolve(extendPath,`.${sep}**${sep}**.js`))

    //遍历所有文件目录，把内容加载到 app.extend下
    fileList.forEach(file => {
        //提取文件名称
        let name=path.resolve(file);
        //截取路径 app/extend/custom-extend.js => custom-extend.js
        name=name.substring(name.lastIndexOf(`extend${sep}`)+`extend${sep}`.length,name.lastIndexOf('.'))
        //把‘-’统一改成驼峰式，custom-extend.js =>customExtend.js
        name=name.replace(/[_-][a-z]/ig,(s)=> s.substring(1).toUpperCase())
        //过滤app 已经存在的 key
        for(const key in app){
            if(key===name){
                console.log(`[extend load error name:${name}] is already in app`)
                return;
            }
        }
        //挂在extend到app上
        app[name]=require(path.resolve(file))(app);
    });
}