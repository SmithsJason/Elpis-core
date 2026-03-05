const assert = require('assert');
const supertest = require('supertest');
const md5 = require('md5');
const elpisCore = require('../../elpis-core');
const signKey='dahaudiajdailjaisi';
const st=Date.now();
describe('测试 project 相关接口', function () {
    this.timeout(60000);
    let modelList;
    const projectList=[ ];
    let request;
    it('启动服务', async () => {
        const app = await elpisCore.start({ listen: false });
        modelList=require('../../model/index.js')(app);
        // 使用 supertest 直接基于 Koa app.callback()，避免端口占用问题
        request = supertest(app.callback());
    });
    it('GET /api/project without proj_key', async () => {
        let tmpRequest = request.get('/api/project');
        tmpRequest=tmpRequest.set('s_t',st);
        tmpRequest=tmpRequest.set('s_sign',md5(`${signKey}_${st}`));
        const res=await tmpRequest;
        const resBody=res.body;
        assert(resBody.code===442);
        assert(resBody.message.indexOf('request validate fail')> -1);
    });
    it('GET /api/project fail', async () => {
        let tmpRequest = request.get('/api/project');
        tmpRequest=tmpRequest.set('s_t',st);
        tmpRequest=tmpRequest.set('s_sign',md5(`${signKey}_${st}`));
        tmpRequest=tmpRequest.query({proj_key:'xxxxxx'});
        const res=await tmpRequest;
        const resBody=res.body;
        assert(resBody.success===false);
        assert(resBody.message.indexOf('项目不存在')> -1);
    })
    it('GET /api/project with proj_key', async () => {
       const checkModule = (moduleItem) => {
                const {moduleType} = moduleItem;
                assert(moduleType);
                if(moduleType==='sider'){
                    const {siderConfig} = moduleItem;
                    assert(siderConfig);
                   siderConfig.forEach(siderMenuItem => {
                        checkMenuItem(siderMenuItem);
                    });
                }
                if(moduleType==='iframe'){
                    const {iframeConfig} = moduleItem;
                    assert(iframeConfig);
                    assert(iframeConfig.path!==undefined);
                }
                if(moduleType==='custom'){
                    const {customConfig} = moduleItem;
                    assert(customConfig);
                    assert(customConfig.path!==undefined);
                }
                if(moduleType==='schema'){
                    const {schemaConfig} = moduleItem;
                    assert(schemaConfig);
                    assert(schemaConfig.api!==undefined);
                    assert(schemaConfig.schema);
                }
            };
       const checkMenuItem = (menuItem) => {
                assert(menuItem.key);
                assert(menuItem.name);
                assert(menuItem.menuType);
               if(menuItem.menuType==='group'){
                assert(menuItem.subMenu !==undefined);
                menuItem.subMenu.forEach(subMenuItem => {
                    checkMenuItem(subMenuItem);
                });
               }
               if(menuItem.menuType==='module'){
                   checkModule(menuItem);
               }
            };
       for(let i=0;i<projectList.length;i++){
            const projItem=projectList[i];
            const { key: projKey } = projItem;
            let tmpRequest = request.get('/api/project');
            tmpRequest=tmpRequest.set('s_t',st);
            tmpRequest=tmpRequest.set('s_sign',md5(`${signKey}_${st}`));
            tmpRequest=tmpRequest.query({proj_key:projKey});
            const res=await tmpRequest;
            assert(res.body.success===true);
            const resData=res.body.data;
            assert(resData.key===projKey);
            assert(resData.modelKey);
            assert(resData.name);
            assert(resData.desc !==undefined);
            assert(resData.homepage !==undefined);
            const {menu} = resData;
            assert(menu);
            assert(menu.length>0);
            menu.forEach(menuItem => {
                checkMenuItem(menuItem);
            });
        }
    });
    it('GET /api/project/list without proj_key', async () => {
        let tmpRequest = request.get('/api/project/list');
        tmpRequest=tmpRequest.set('s_t',st);
        tmpRequest=tmpRequest.set('s_sign',md5(`${signKey}_${st}`));
        const res=await tmpRequest;
        assert(res.body.success===true);
        const resData=res.body.data;
        projectList.push(...resData);
        assert(resData.length>0);
        for(let i=0;i<resData.length;i++){
            const item=resData[i];
            assert(item.modelKey);
            assert(item.key);
            assert(item.name);
            assert(item.desc !==undefined);
            assert(item.homepage !==undefined);
        }
    })
    it('GET /api/project/list with proj_key', async () => {
        const projKey=projectList[Math.floor(Math.random()*projectList.length)].key;
        const { modelKey } = projectList.find(item=>item.key===projKey);
        let tmpRequest = request.get('/api/project/list');
        tmpRequest=tmpRequest.set('s_t',st);
        tmpRequest=tmpRequest.set('s_sign',md5(`${signKey}_${st}`));
        tmpRequest=tmpRequest.query({proj_key:projKey});
        const res=await tmpRequest;
        assert(res.body.success===true);
        const resData=res.body.data;
        assert(projectList.filter(item=>item.modelKey===modelKey).length=== resData.length);
        for(let i=0;i<resData.length;i++){
            const item=resData[i];
            assert(item.modelKey);
            assert(item.key);
            assert(item.name);
            assert(item.desc !==undefined);
            assert(item.homepage !==undefined);
        }
    })
    it('GET /api/project/model_list', async () => {
        let tmpRequest = request.get('/api/project/model_list');
        tmpRequest=tmpRequest.set('s_t',st);
        tmpRequest=tmpRequest.set('s_sign',md5(`${signKey}_${st}`));
        const res=await tmpRequest;
        assert(res.body.success===true);

        const resData=res.body.data;
        assert(resData.length>0);

        for(let i=0;i<resData.length;i++){
            const item=resData[i];
            assert(item.model);
            assert(item.model.key);
            assert(item.model.name);
            assert(item.project);
            for(const projKey in item.project){
                assert(item.project[projKey].key);
                assert(item.project[projKey].name);
            }
        }
    })
})