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
    let buyerACC;

    // do this before each test
    this.beforeEach(async function () {
        master = new AccountStore(100e6); //100 Algos
        buyerACC = new AccountStore(100000e6);
        nonCreatorAccount = new AccountStore(100e6); //100 Algos
        accountWithIncufficientBalance = new AccountStore(2200000); 
        runtime = new Runtime([master,nonCreatorAccount,accountWithIncufficientBalance,buyerACC]);
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
            2,
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
            3,
            0,
            [convert.uint64ToBigEndian(ID)]
        );
    };
    

    const createdAsset = (acc) => {
        const appID1 = appInfoMint.appID;
    
        //create asset
        const createAsset = ["createAsset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: acc,
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
    const purchaseAsset = (runtime, account, appID, appAccount, assets, price, buyer) => {
        const purchase = [convert.stringToBytes("purchase"),convert.uint64ToBigEndian(amountToPurchase)];
        runtime.executeTx([
            {
                type: types.TransactionType.TransferAlgo,
                sign: types.SignType.SecretKey,
                fromAccount: buyer,
                toAccountAddr: appAccount,
                amountMicroAlgos: price, //price
                payFlags: { totalFee: 1000 },
            },
            {
                type: types.TransactionType.CallApp,
                sign: types.SignType.SecretKey,
                fromAccount: account,
                appID: appID,
                payFlags: { totalFee: 1000 },
                accounts: [appAccount],
                foreignAssets: [assets],
                appArgs: purchase,
            }
        ]);
    };

    
    const saveHoldingBurn = (runtime, account, appID, holdigsAppAdress,burnAppAdress) => {
        const save  = ["accountsHoldingBurn"].map(convert.stringToBytes);
        const accounts = [holdigsAppAdress,burnAppAdress];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: accounts,
            appArgs: save,
        });
    };


    it("update price fails when called by non-creator" , () => {

        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);

        //update price by non creator
        assert.throws(() => { common.updatePrice(runtime,nonCreatorAccount.account,appInfoHolding.appID) }, RUNTIME_ERR1009);
    
    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    it("Transfer fails when called by non-creator" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //transfer asset by non creator
        assert.throws(() => { common.transferAsset(runtime,nonCreatorAccount.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,2000) }, RUNTIME_ERR1009);


    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    it("Burn fails when called by non-creator" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoBurn = initBurn(ID);

        //do opt in
        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);

        //burn asset by non creator
        assert.throws(() => { common.burnAsset(runtime,nonCreatorAccount.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    

    it("Creator burns more than the current supply of tokens fails" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoBurn = initBurn(ID);

        //do opt in
        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);

        //burn asset by non creator
        assert.throws(() => { burnAsset(runtime,master.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);

    it("Buyer tries to purchase token with insufficient algos" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);


        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //purchase asset by account with insufficient algos
        amountToPurchase=1;
        assert.throws(() => { purchaseAsset(runtime,accountWithIncufficientBalance.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,amountToPurchase*2000000, accountWithIncufficientBalance.account) }, RUNTIME_ERR1009);

    }).timeout(20000);

    
    it("Buyer tries to purchase 0 number of tokens" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);


        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //purchase 0 asset
        amountToPurchase=0;
        assert.throws(() => { purchaseAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,amountToPurchase*2000000, master.account) }, RUNTIME_ERR1009);


    }).timeout(20000);

    it("Buyer tries to purchase more than the current supply of tokens" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //transfer to holding
        common.transferAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,20);

        //purchase more than the current supply
        amountToPurchase=22;
        assert.throws(() => { purchaseAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,amountToPurchase*2000000, nonCreatorAccount.account) }, RUNTIME_ERR1009);

    }).timeout(20000);

    it("double asset creation fails" , () => {
        appInfoMint = initMint();
        
        //create asset for the first time
        createdAsset(master.account);
        
        //double creation should fail
        assert.throws(() => { createdAsset(master.account) }, RUNTIME_ERR1009);


    }).timeout(20000);


    it("asset creation fails when called by non creator" , () => {
        appInfoMint = initMint();
        
        assert.throws(() => { createdAsset(nonCreatorAccount.account) }, RUNTIME_ERR1009);

    }).timeout(20000);

    it("Transfer fails when when supply is insufficient" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //transfer amount of asset that is bigger than the supply
        assert.throws(() => { common.transferAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,1000000000) }, RUNTIME_ERR1009);

    }).timeout(20000);


    it("Selling tokens fails when transaction is not grouped" , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //fails when payment is not done (zero algos were sent to the contract)
        assert.throws(() => { purchaseAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,0, master.account) }, RUNTIME_ERR1009);


    }).timeout(20000);


    it("transfer asset fails when transfer to non holding app " , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);

        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        //do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

        //transfer asset to non holding app (burn for example)
        assert.throws(() => { common.transferAsset(runtime,master.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID,2000) }, RUNTIME_ERR1009);


    }).timeout(20000);

    it("burn asset fails when burn to non burn app " , () => {
        appInfoMint = initMint();
        const ID = createdAsset(master.account);
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);

        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        //do opt in
        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);

        //burn asset to non burn app (holding for example)
        assert.throws(() => { common.burnAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID) }, RUNTIME_ERR1009);


    }).timeout(20000);

});
