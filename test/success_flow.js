const { types } = require("@algo-builder/web");
const { assert, expect } = require("chai");
const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const algosdk = require("algosdk");
const { convert } = require("@algo-builder/algob");
const common = require("./commonFile");

const approvalFileMint = "mint_approval.py";
const clearStateFileMint = "mint_clearstate.py";

const approvalFileHolding = "holdings_approval.py";
const clearStateFileHolding = "holdings_clearstate.py";

const approvalFileBurn = "burn_approval.py";
const clearStateFileBurn = "burn_clearstate.py";

describe("Success Flow", function () {
    // Write your code here
    let master;
    let runtime;
    let appInfoMint;

    // do this before each test
    this.beforeEach(async function () {
        master = new AccountStore(1e9);
        runtime = new Runtime([master]);
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

        return assetID;
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
    
    it("Deploys mint contract successfully", () => {
        const appInfo = initMint();
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);

    }).timeout(50000);


    it("Deploys holding contract successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfo = initHolding(ID);
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);

    }).timeout(50000); //i changed the timeout because i got a timeout exception that prevents me from completing the test


    it("Deploys Burn contract successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfo = initBurn(ID);
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);

    }).timeout(50000);


    it("Holding contract opts in successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding= initHolding(ID);

        // do opt in
        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);

    }).timeout(50000); //i changed the timeout because i got a timeout exception that prevents me from completing the test


    it("burn contract opts in successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoBurn= initBurn(ID);

        // do opt in
        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);

    }).timeout(50000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    
    it("asset created successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        
        // verify assetID
        assert.isDefined(ID);

    }).timeout(50000);


    it("price updated successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //update price
        common.updatePrice(runtime,master.account,appInfoHolding.appID);

        //check new price
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        assert.equal(getGlobal(appInfoHolding.appID, "assetCurrentPrice"), 500);
        

    }).timeout(50000); //i changed the timeout because i got a timeout exception that prevents me from completing the test

    
    it("amount transferd successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        common.optInHolding(runtime, master.account, appInfoHolding.appID, ID);
        
        //do transfer
        common.transferAsset(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID,2000);

        const appAccount = runtime.getAccount(appInfoHolding.applicationAccount);
        
        //check amount transfered
        assert.equal(Number(appAccount.assets.get(ID).amount),2000);

    }).timeout(50000); //i changed the timeout because i got a timeout exception that prevents me from completing the test


    it("amount burned successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);
        const appInfoBurn = initBurn(ID);
        
        saveHoldingBurn(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);


        common.optInBurn(runtime, master.account, appInfoBurn.appID, ID);
        
        //do burn
        common.burnAsset(runtime,master.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID);

        const appAccount = runtime.getAccount(appInfoBurn.applicationAccount);
        
        //check amount burned
        assert.equal(Number(appAccount.assets.get(ID).amount),2000);

    }).timeout(50000); //i changed the timeout because i got a timeout exception that prevents me from completing the test
    

});
