const { DataBaseModel } = require(`${process.cwd()}/files/ihorizon-api/main`);

async function main() {    
let client = await new DataBaseModel({id: DataBaseModel.Get, key: "DB.TEST.COUCOU"});
console.log(client);
}
main();