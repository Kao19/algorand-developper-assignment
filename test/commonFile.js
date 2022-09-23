const { convert } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");



const initContract = (runtime, creatorAccount, approvalFile, clearStateFile, locInts, locBytes, gloInts, gloBytes, args) => {
    // create new app
    runtime.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: creatorAccount,
            localInts: locInts,
            localBytes: locBytes,
            globalInts: gloInts,
            globalBytes: gloBytes,
            appArgs: args,
        },
        { totalFee: 1000 }, //pay flags
    );

    const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
    const appAddress = appInfo.applicationAccount;  

    // fund the contract
    runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccount, //use the account object
        toAccountAddr: appAddress, //app address
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    return appInfo;
};


const optInBurn = (runtime, account, appID, asset) => {
    const optinAssetBurn = ["optin_burn"].map(convert.stringToBytes);
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [asset],
        appArgs: optinAssetBurn,
    });
};

const optInHolding = (runtime, account, appID, asset) => {
    const optinAssetHolding = ["optin"].map(convert.stringToBytes);
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [asset],
        appArgs: optinAssetHolding,
    });
};


const newPrice = 500;
const updatePrice = (runtime, account, appID) => {
    const updateprice = [convert.stringToBytes("UpdatePrice"),convert.uint64ToBigEndian(newPrice)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        appArgs: updateprice,
    });
};

const amountToSendBurn = 2000;
const burnAsset = (runtime, account, appID, appAccount, assets) => {
    const burn = [convert.stringToBytes("burn"),convert.uint64ToBigEndian(amountToSendBurn)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        accounts: [appAccount],
        foreignAssets: [assets],
        appArgs: burn,
    });
};


const amountToSendTransfer = 2000;
const transferAsset = (runtime, account, appID, appAccount, assets) => {
    const transfer = [convert.stringToBytes("transfer"),convert.uint64ToBigEndian(amountToSendTransfer)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        accounts: [appAccount],
        foreignAssets: [assets],
        appArgs: transfer,
    });
};


module.exports = {
    initContract,
    optInBurn,
    optInHolding,
    updatePrice,
    burnAsset,
    transferAsset
}