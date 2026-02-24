const glob=require('glob');
const path=require('path');
const {sep} =path;
/**
 * controller loadeer
 * @param {object} app Koa实例
 * 
 * 加载所有controller，可通过‘app.controller.${目录}.${文件}' 访问
 *
    eg:
    app/controller
      |
      | --custom-controller
            |
            | -- custom-controller.js
    =>app.controller.customController.customController
 */

module.exports=(app)=>{
    // 读取 app/controller/**/**.js 下的所有文件
    const controllerPath=path.resolve(app.businessPath,`.${sep}controller`)
    const fileList=glob.sync(path.resolve(controllerPath,`.${sep}**${sep}**.js`))

    //遍历所有文件目录，把内容加载到 app.controller下
    const controller={};
    fileList.forEach(file => {
        //提取文件名称
        let name=path.resolve(file);
        //截取路径 app/controller/custom-module/custom-controller.js => custom-module/custom-controller.js
        name=name.substring(name.lastIndexOf(`controller${sep}`)+`controller${sep}`.length,name.lastIndexOf('.'))
        //把‘-’统一改成驼峰式，custom-module/custom-controller.js =>customModule/customController.js
        name=name.replace(/[_-][a-z]/ig,(s)=> s.substring(1).toUpperCase())
        //挂在controller到内存app对象中  
        let temController=controller;
        const names=name.split(sep)
        for(let i=0,len=names.length;i<len;i++){
            if(i==len-1)
                {
                    //文件
                    const ControllerModule=require(path.resolve(file))(app);
                    temController[names[i]]=new ControllerModule();
            }
            else{
                //文件夹
                if(!temController[names[i]]){
                    temController[names[i]]={};
                }
                temController=temController[names[i]];
            }
        } 
    });
    app.controller=controller
}