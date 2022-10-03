const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");


async function run(runtimeEnv, deployer) {
    // write your code here

    const master = deployer.accountsByName.get("master");

    // application call to update the price
    const updateprice = [convert.stringToBytes("UpdatePrice"),convert.uint64ToBigEndian(2e6)];
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: deployer.getCheckpointKV("holdingsAppID"),
        payFlags: { totalFee: 1000 },
        appArgs: updateprice,
    });
   
    
    
    let globalState = await readAppGlobalState(deployer, master.addr, deployer.getCheckpointKV("holdingsAppID"));
    console.log(globalState)

}

module.exports = { default: run };