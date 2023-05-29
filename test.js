const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

async function main() {
    // let x = await DataBaseModel({ id: DataBaseModel.Get, key: `BOT` });

    var level = await DataBaseModel({id: DataBaseModel.Get, key: `999449972615413861.USER.171356978310938624.XP_LEVELING.level`});

    console.log(level)
}
main()