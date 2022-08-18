const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    
    const master = deployer.accountsByName.get("master");

    const approvalFileMint = "mint_approval.py";
    const clearStateFileMint = "mint_clearstate.py";
    
    const approvalFileHolding = "holdings_approval.py";
    const clearStateFileHolding = "holdings_clearstate.py";

    // get Mint app info
    const appMint = deployer.getApp(approvalFileMint, clearStateFileMint);

    // get the asset Id
    let globalState = await readAppGlobalState(deployer, master.addr, appMint.appID);
    const assetID = globalState.get("Id");
    
    // get holding app info
    const appHolding = deployer.getApp(approvalFileHolding, clearStateFileHolding);

    // transfer alos to holding contracts 
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: appHolding.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });


    // application call to optin to the asset
    const optinAsset = ["optin"].map(convert.stringToBytes);
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appHolding.appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: optinAsset,
    });


    // application call to transfer the asset
    const amountToSend = 3000;
    const transfer = [convert.stringToBytes("transfer"),convert.uint64ToBigEndian(amountToSend)];
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appMint.appID,
        payFlags: { totalFee: 1000 },
        accounts: [appHolding.applicationAccount],
        foreignAssets: [assetID],
        appArgs: transfer,
    });

    
    let globalStatePrice = await readAppGlobalState(deployer, master.addr, appHolding.appID);
    console.log(globalStatePrice);

    // get client info
    let appAccount = await deployer.algodClient.accountInformation(appHolding.applicationAccount).do();
    console.log(appAccount);

}

module.exports = { default: run };
