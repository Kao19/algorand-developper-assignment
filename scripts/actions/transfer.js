const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    
    const master = deployer.accountsByName.get("master");

    const approvalFileMint = "mint_approval.py";
    const clearStateFileMint = "mint_clearstate.py";

    // get Mint app info
    const appMint = deployer.getApp(approvalFileMint, clearStateFileMint);

    // get the asset Id
    let globalState = await readAppGlobalState(deployer, master.addr, appMint.appID);
    const assetID = globalState.get("Id");


    // application call to transfer the asset
    const amountToSend = 3000;
    const transfer = [convert.stringToBytes("transfer"),convert.uint64ToBigEndian(amountToSend)];
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appMint.appID,
        payFlags: { totalFee: 1000 },
        accounts: [deployer.getCheckpointKV("holdingsAppAddress")],
        foreignAssets: [assetID],
        appArgs: transfer,
    });

    
    let globalStatePrice = await readAppGlobalState(deployer, master.addr, deployer.getCheckpointKV("holdingsAppID"));
    console.log(globalStatePrice);

    // get client info
    let appAccount = await deployer.algodClient.accountInformation(deployer.getCheckpointKV("holdingsAppAddress")).do();
    console.log(appAccount);

}

module.exports = { default: run };