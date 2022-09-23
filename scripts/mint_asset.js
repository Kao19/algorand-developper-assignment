const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    const master = deployer.accountsByName.get("master");

    const approvalFileMint = "mint_approval.py";
    const clearStateFileMint = "mint_clearstate.py";

    
    const approvalFileHolding = "holdings_approval.py";
    const clearStateFileHolding = "holdings_clearstate.py";

    
    const approvalFileBurn = "burn_approval.py";
    const clearStateFileBurn = "burn_clearstate.py";



    //deploying the mint contract
    await deployer.deployApp(
        approvalFileMint,
        clearStateFileMint,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 0,
        },
        { totalFee: 1000 }
    );

    // get app info
    const app = deployer.getApp(approvalFileMint, clearStateFileMint);

    // fund contract with some algos to handle inner txn
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: app.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    //application call to create the asset
    const createAsset = ["createAsset"].map(convert.stringToBytes);
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: app.appID,
        payFlags: { totalFee: 1000 },
        appArgs: createAsset,
    });


    // get the tesla id from the global state
    let globalState = await readAppGlobalState(deployer, master.addr, app.appID);
    const assetID = globalState.get("Id");




    // deploying the holding contract 
    await deployer.deployApp(
        approvalFileHolding,
        clearStateFileHolding,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 2,
            globalBytes: 0,
            appArgs: [convert.uint64ToBigEndian(assetID)],
        },
        { totalFee: 1000 }
    );



    // deploying the burn contract
    await deployer.deployApp(
        approvalFileBurn,
        clearStateFileBurn,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 0,
            appArgs: [convert.uint64ToBigEndian(assetID)],
        },
        { totalFee: 1000 }
    );

}

module.exports = { default: run };
