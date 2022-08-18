<template>
    <div id="buyasset" class="mb-5">
        <h3>Buy TESLA coin</h3>
        <p>You can only mint up to 1000 TESLA coins</p>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p>TESLA coins left: {{ this.asset_left }}</p>
        <form
            action="#"
            @submit.prevent="handleBuyAsset"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Buy amount</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <button type="submit" class="btn btn-primary">Buy</button>
        </form>
    </div>
</template>

<script>
import algosdk from 'algosdk';
import { getAlgodClient } from "../client.js";
import * as helpers from '../helpers';
import holdingCfg from "../artifacts/mint_asset.js.cp.yaml"; //copy the yaml file generated in the artifacts after deploying the mint script, then copy the file into artifact folder in src, then delete the timestamp of holding contract and change "holdings_approval.py-holdings_clearstate.py" to holdings_approval
import wallets from "../wallets.js";


export default {
    props: {
        connection: String,
        network: String,
    },
    data() {
        return {
            acsTxId: "",
            asset_left: 0,
            asset_amount: 0,
            explorerURL: "",
        };
    },
    created(){
        this.teslaLeft();
    },
    methods: {
        
        async teslaLeft(){
            const algodClient = getAlgodClient("Localhost");
            let applicationInfoResponse = await algodClient.accountInformation(holdingCfg.default.ssc.holdings_approval.applicationAccount).do();
            this.asset_left=applicationInfoResponse.assets[0].amount;
        },

        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },
        async handleBuyAsset() {
            // write code here

            const algodClient = getAlgodClient("Localhost");
            let sender = algosdk.mnemonicToSecretKey(process.env.VUE_APP_ACC1_MNEMONIC).addr; //please adjust the sender upon your connected acount on algosigner

            let params = await algodClient.getTransactionParams().do();
            params.fee = 1000
            params.flatFee = true

            const index= holdingCfg.default.ssc.holdings_approval.appID; 

            let applicationInfoResponse = await algodClient.getApplicationByID(index).do();
            
            // sender opts in to the tesla asset
            let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                sender,
                sender,
                undefined,
                undefined,
                0,
                undefined,
                applicationInfoResponse['params']['global-state'][1].value.uint,
                params
            );

            // sender sends algos to the holding contract
            let txn2 = algosdk.makePaymentTxnWithSuggestedParams(
                sender, 
                holdingCfg.default.ssc.holdings_approval.applicationAccount, 
                applicationInfoResponse['params']['global-state'][0].value.uint*this.asset_amount, 
                undefined, 
                undefined, 
                params
            );

            // convert args into base64
            const purchaseBase64 = window.btoa('purchase'); 
            var amountBase64 = [];
            var amountTmp = this.asset_amount;
            var i = 8;
            do {
            amountBase64[--i] = amountTmp & (255);
            amountTmp = amountTmp >> 8;
            } while ( i );

            //push args into an array
            let appArgs = [];
            appArgs.push(new Uint8Array(Buffer.from(purchaseBase64, "base64")));
            appArgs.push(new Uint8Array(Buffer.from(amountBase64, "base64")));

            // application call to get the asset
            let txn3 = algosdk.makeApplicationNoOpTxn(
                sender, 
                params, 
                index,
                appArgs,
                undefined,
                undefined,
                [applicationInfoResponse['params']['global-state'][1].value.uint]
            );

            // Store txns
            let txns = [txn1, txn2, txn3];

            // Assign group ID
            algosdk.assignGroupID(txns);

            // send transactions to atomic transfer
            await wallets.sendAlgoSignerTransaction(txns, algodClient);

},
    },
};
</script>
