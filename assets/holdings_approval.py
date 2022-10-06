import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def holdings_approval():

    basic_checks = And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address()
    )

    #to get the asset Id during the deployment and send it within parameters
    assetID = Btoi(Txn.application_args[0])
    handle_creation = Seq([
        Assert(basic_checks),
        App.globalPut(Bytes("assetID"), assetID),
        App.globalPut(Bytes("assetCurrentPrice"), Int(5000000)),
        Return(Int(1))
    ])

    
    newPrice = Btoi(Txn.application_args[1])
    update_price= Seq([
        Assert(basic_checks),
        Assert(Txn.sender()==Global.creator_address()),
        App.globalPut(Bytes("assetCurrentPrice"), newPrice),
        Return(Int(1))
    ])

    # opting in to receive the asset
    optin=Seq([
        Assert(basic_checks),
        Assert(App.globalGet(Bytes("optInStatus")) == Int(0)), # if this variable doesn't exist, the contract hasn't opted in before 
        Assert(Txn.assets[0] == App.globalGet(Bytes("assetID"))),
        Assert(Txn.sender() == Global.creator_address()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Global.current_application_address(),
        TxnField.asset_amount: Int(0),
        TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("optInStatus"), Int(1)), #this variable is created and initialized after optin
        Return(Int(1))
    ])

    # get the blance of the asset
    AssetBalance = AssetHolding.balance(Global.current_application_address(), App.globalGet(Bytes("assetID")))
    amount = Seq(
        AssetBalance,
        Assert(AssetBalance.hasValue()),
        AssetBalance.value()
    )

    # check if the balance of the sender is valid by substructing the min balance
    isBalanceValid = Balance(Gtxn[1].sender()) - MinBalance(Gtxn[1].sender())
    TeslaAmount = Btoi(Gtxn[1].application_args[1])
    purchase = Seq([
        Assert(basic_checks),
        Assert(TeslaAmount > Int(0)),
        Assert(amount>=TeslaAmount),
        Assert(Gtxn[1].assets[0] == App.globalGet(Bytes("assetID"))),
        Assert(Global.group_size() == Int(2)),
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[1].type_enum() == TxnType.ApplicationCall),
        Assert(isBalanceValid>=App.globalGet(Bytes("assetCurrentPrice"))*TeslaAmount + Int(1000)),
        Assert(Gtxn[0].amount() == App.globalGet(Bytes("assetCurrentPrice"))*TeslaAmount), #check if the contract recieved exactly teslaAmount * currentPrice
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Gtxn[1].sender(),
        TxnField.asset_amount: TeslaAmount,
        TxnField.xfer_asset: Gtxn[1].assets[0], 
        }),
        InnerTxnBuilder.Submit(),
        Return(Int(1))
    ])

    handle_noop = Seq(
        Assert(basic_checks),
        Cond(
            [Txn.application_args[0] == Bytes("optin"), optin],
            [Txn.application_args[0] == Bytes("UpdatePrice"), update_price],
            [Txn.application_args[0] == Bytes("purchase"), purchase],
        )
    )


    handle_optin = Seq([
        Assert(App.optedIn(Txn.sender(), Txn.application_id())),
        Return(Int(1))
    ])

    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop]
    )



    return program

if __name__ == "__main__":
    params = {}

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_params(sys.argv[1], params)

    print(compileTeal(holdings_approval(), mode=Mode.Application, version=6))