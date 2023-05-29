const { DataBaseModel } = require(`${process.cwd()}/files/ihorizon-api/main`);
 
let db = await new DataBaseModel({id: DataBaseModel.Get, key: "DB.TEST.COUCOU"});
