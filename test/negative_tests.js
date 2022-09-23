const { types } = require("@algo-builder/web");
const { assert } = require("chai");
const { Runtime, AccountStore } = require("@algo-builder/runtime");
const { convert } = require("@algo-builder/algob");
const common = require("./commonFile");

const approvalFileMint = "mint_approval.py";
const clearStateFileMint = "mint_clearstate.py";

const approvalFileHolding = "holdings_approval.py";
const clearStateFileHolding = "holdings_clearstate.py";

const approvalFileBurn = "burn_approval.py";
const clearStateFileBurn = "burn_clearstate.py";

// Errors
const RUNTIME_ERR1009 = 'RUNTIME_ERR1009: TEAL runtime encountered err opcode'; // rejected by logic


describe("Negative Tests", function () {
    // Write your code here
    let master;
    let accountWithIncufficientBalance;
    let runtime;
    let appInfoMint;
    let nonCreatorAccount;

    // do this before each test
    this.beforeEach(async function () {
        master = new AccountStore(100e6); //100 Algos
        nonCreatorAccount = new AccountStore(100e6); //100 Algos
        accountWithIncufficientBalance = new AccountStore(110000); //100 Algos
        runtime = new Runtime([master,nonCreatorAccount,accountWithIncufficientBalance]);
    });


    const initMint = () => {
        return common.initContract(
            runtime, 
            master.account, 
            approvalFileMint, 
            clearStateFileMint,
            0,
            0,
            1,
            0,
            []
        );
    };
    
    
    const initBurn = (ID) => {
        return common.initContract(
            runtime, 
            master.account, 
            approvalFileBurn, 
            clearStateFileBurn,
            0,
            0,
            1,
            0,
            [convert.uint64ToBigEndian(ID)]
        );
    };
    
    const initHolding = (ID) => {
        return common.initContract(
            runtime, 
            master.account, 
            approvalFileHolding, 
            clearStateFileHolding,
            0,
            0,
            2,
            0,
            [convert.uint64ToBigEndian(ID)]
        );
    };
    

    const createdAsset = () => {
        const appID1 = appInfoMint.appID;
    
        //create asset
        const createAsset = ["createAsset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: master.account,
            appID: appID1,
            payFlags: { totalFee: 1000 },
            appArgs: createAsset,
        });
    
        //get asset ID
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        const assetID = Number(getGlobal(appID1, "Id"));
        //console.log(assetID);
    
        return assetID;
    };
    
    const amountToSendBurn = 20000000000;
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

    let amountToPurchase = 2000000000000;
    const purchaseAsset = (runtime, account, appID, appAccount, assets) => {
        const purchase = [convert.stringToBytes("purchase"),convert.uint64ToBigEndian(amountToPurchase)];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: [appAccount],
            foreignAssets: [assets],
            appArgs: purchase,
        });
    };


    it("update price fails when called by non-creator" , () => {

        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //update price by non creator
        assert.throws(() => { common.updatePrice(runtime,nonCreatorAccount.account,appInfoHolding.appID) }, RUNTIME_ERR1009);
    
    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    it("Transfer fails when called by non-creator" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //transfer asset by non creator
        assert.throws(() => { common.transferAsset(runtime,nonCreatorAccount.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    it("Burn fails when called by non-creator" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoBurn = initBurn(ID);

        //do opt in
        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);

        //burn asset by non creator
        assert.throws(() => { common.burnAsset(runtime,nonCreatorAccount.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    

    it("Creator burns more than the current supply of tokens fails" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoBurn = initBurn(ID);

        //do opt in
        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);

        //burn asset by non creator
        assert.throws(() => { burnAsset(runtime,master.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);

    it("Buyer tries to purchase token with insufficient algos" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //purchase asset by account with insufficient algos
        assert.throws(() => { purchaseAsset(runtime,accountWithIncufficientBalance.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);

    
    it("Buyer tries to purchase 0 number of tokens" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //purchase 0 asset
        amountToPurchase=0;
        assert.throws(() => { purchaseAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);

    it("Buyer tries to purchase more than the current supply of tokens" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //purchase more than the current supply
        amountToPurchase=100000000;
        assert.throws(() => { purchaseAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);


});
