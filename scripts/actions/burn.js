const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    
    const master = deployer.accountsByName.get("master");

    const approvalFileMint = "mint_approval.py";
    const clearStateFileMint = "mint_clearstate.py";
    
    const approvalFileBurn = "burn_approval.py";
    const clearStateFileBurn = "burn_clearstate.py";

    // get app info
    const appMint = deployer.getApp(approvalFileMint, clearStateFileMint);

    // get the asset Id
    let globalState = await readAppGlobalState(deployer, master.addr, appMint.appID);
    const assetID = globalState.get("Id");
    
    
    // get app info
    const appBurn = deployer.getApp(approvalFileBurn, clearStateFileBurn);

    // application call to burn the asset
    const amountToSend = 3000;
    const burn = [convert.stringToBytes("burn"),convert.uint64ToBigEndian(amountToSend)];
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appMint.appID,
        payFlags: { totalFee: 1000 },
        accounts: [appBurn.applicationAccount],
        foreignAssets: [assetID],
        appArgs: burn,
    });

    // get client info
    let appAccount = await deployer.algodClient.accountInformation(appBurn.applicationAccount).do();
    console.log(appAccount);


}

module.exports = { default: run };