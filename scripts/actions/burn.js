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

    // transfer algos to burn contract
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: appBurn.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    // opting in to the asset
    const optinAssetBurn = ["optin_burn"].map(convert.stringToBytes);
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appBurn.appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: optinAssetBurn,
    });

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
