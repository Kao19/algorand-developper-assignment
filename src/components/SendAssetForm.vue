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
import configHolding from "../../artifacts/scripts/mint_asset.js.cp.yaml";
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
            algodClient: null,
            holdingsAppAddress: null,
            holdingsAppID: null,
        };
    },
    created(){
        this.algodClient = getAlgodClient("Localhost");
        const holdingsApp = configHolding.default.metadata;
        this.holdingsAppAddress = holdingsApp.holdingsAppAddress;
        this.holdingsAppID = holdingsApp.holdingsAppID;
        this.amountTesla();
    },
    methods: {
        
        async amountTesla(){
            let applicationInfoResponse1 = await this.algodClient.accountInformation(this.holdingsAppAddress).do();
            this.asset_left=applicationInfoResponse1.assets[0].amount;
        },

        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },
        async handleBuyAsset() {

            this.amountTesla();
            let sender = algosdk.mnemonicToSecretKey(process.env.VUE_APP_ACC1_MNEMONIC).addr; //please adjust the sender upon your connected acount on algosigner
            let params = await this.algodClient.getTransactionParams().do();
            params.fee = 1000;
            params.flatFee = true;


            let applicationInfoResponse = await this.algodClient.getApplicationByID(this.holdingsAppID).do();
            
            const senderInfo = await this.algodClient.accountInformation(sender).do();

            //loop through the assets array
            for(let i=0; i<=senderInfo.assets.length; i++){
                
                //check for each element if it undefined or if we've finished looping the array and find no matching id, if that's the case we do opt in
                if(typeof senderInfo.assets[i] === 'undefined' || (senderInfo.assets[i]['asset-id'] !== applicationInfoResponse['params']['global-state'][1].value.uint && i === senderInfo.assets.length -1)){
                    
                    let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                        sender,
                        sender,
                        undefined,
                        undefined,
                        0,
                        undefined,
                        applicationInfoResponse['params']['global-state'][1].value.uint,
                        params
                    );
                    await wallets.sendAlgoSignerOptInTransaction(txn, this.algodClient);
                    break;
                }

                //user already opt in
                else if(senderInfo.assets[i]['asset-id'] === applicationInfoResponse['params']['global-state'][1].value.uint){
                    break;
                }
            }
        
            let txn2 = algosdk.makePaymentTxnWithSuggestedParams(
                sender, 
                this.holdingsAppAddress, 
                applicationInfoResponse['params']['global-state'][0].value.uint*this.asset_amount + 1000, 
                undefined, 
                undefined, 
                params,
            );

            let appArgs = [new Uint8Array(Buffer.from("purchase")), algosdk.encodeUint64(Number(this.asset_amount))];

            let txn3 = algosdk.makeApplicationNoOpTxn(
                sender, 
                params, 
                this.holdingsAppID,
                appArgs,
                undefined,
                undefined,
                [applicationInfoResponse['params']['global-state'][1].value.uint]
            );
            
            // Store txns
            let txns = [txn2, txn3];

            // Assign group ID
            algosdk.assignGroupID(txns);

            const txnID = await wallets.sendAlgoSignerTransaction(txns, this.algodClient);
            
            this.amountTesla();
            if(txnID) {
                this.updateTxn(txnID.txId);
            }
            else{
                this.$alert("something went wrong with your transaction!"); // make sure vue-simple-alert is installed
            }
        
        },
    },
};
</script>