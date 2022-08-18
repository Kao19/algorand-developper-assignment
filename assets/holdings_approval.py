# import sys
# sys.path.insert(0,'.')

# from algobpy.parse import parse_params
# from pyteal import *

# def holdings_approval():

#     basic_checks = Seq([
#         Assert(Txn.rekey_to() == Global.zero_address()),
#         Assert(Txn.close_remainder_to() == Global.zero_address()),
#         Assert(Txn.asset_close_to() == Global.zero_address()),
#         Return(Int(1))
#     ])

    # newPrice = Btoi(Txn.application_args[1])
    # asset_update_price = Seq([
    #     Assert(App.optedIn(Txn.sender(), Txn.application_id())),
    #     App.globalPut(Bytes("assetCurrentPrice"), newPrice),
    #     Return(Int(1))
    # ])

#     purchase = Seq([
#         InnerTxnBuilder.Begin(),
#         InnerTxnBuilder.SetFields({
#         TxnField.type_enum: TxnType.AssetTransfer,
#         TxnField.asset_receiver: Txn.receiver(),
#         TxnField.asset_amount: 1,
#         TxnField.xfer_asset: InnerTxn.created_asset_id(),
#         }),
#         InnerTxnBuilder.Submit(),
#         Return(Int(1))
#     ])

#     price = App.globalGet(Bytes("assetCurrentPrice"))
#     payment = Seq([
#         InnerTxnBuilder.Begin(),
#         InnerTxnBuilder.SetFields({
#         TxnField.type_enum: TxnType.Payment,
#         TxnField.amount: price,
#         TxnField.receiver: Txn.sender()
#         }),
#         InnerTxnBuilder.Submit(),
#         Return(Int(1))
#     ])

#     check_balance = Seq([
#         If(Balance(Txn.receiver()) >= Int(5000000),purchase,payment),
#         Return(Int(1))
#     ])

#     assetID = Btoi(Txn.application_args[0])
#     handle_creation = Seq([
#         basic_checks,
#         App.globalPut(Bytes("assetID"), assetID),
#         App.globalPut(Bytes("assetCurrentPrice"), Int(500000)),
#         Return(Int(1))
#     ])
    
#     handle_optin = Seq([
#         Assert(App.optedIn(Txn.sender(), Txn.application_id())),
#         Return(Int(1))
#     ])
    

#     handle_noop = Seq(
#         Cond(
#             [Txn.application_args[0] == Bytes("purchase"), check_balance],
#             [Txn.application_args[0] == Bytes("updatePrice"), asset_update_price]
#         )
#     )

#     handle_closeout = Return(Int(1))
#     handle_updateapp = Return(Int(0))
#     handle_deleteapp = Return(Int(0))
    
#     program = Cond(
#         [Txn.application_id() == Int(0), handle_creation],
#         [Txn.on_completion() == OnComplete.OptIn, handle_optin],
#         [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
#         [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
#         [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
#         [Txn.on_completion() == OnComplete.NoOp, handle_noop]
#     )

#     return program

# if __name__ == "__main__":
#     params = {}

#     # Overwrite params if sys.argv[1] is passed
#     if(len(sys.argv) > 1):
#         params = parse_params(sys.argv[1], params)

#     print(compileTeal(holdings_approval(), mode=Mode.Application, version=6))
















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
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Global.current_application_address(),
        TxnField.asset_amount: Int(0),
        TxnField.xfer_asset: Txn.assets[0], # Must be in the assets array sent as part of the application call
        }),
        InnerTxnBuilder.Submit(),
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
    TeslaAmount = Btoi(Gtxn[2].application_args[1])
    purchase = Seq([
        Assert(basic_checks),
        Assert(amount>=TeslaAmount),
        Assert(TeslaAmount<=Int(1000)), #to mint up less than 1000 coin (based on the note in the frontend)
        Assert(isBalanceValid>=App.globalGet(Bytes("assetCurrentPrice"))*TeslaAmount),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
        TxnField.type_enum: TxnType.AssetTransfer,
        TxnField.asset_receiver: Gtxn[2].sender(),
        TxnField.asset_amount: TeslaAmount,
        TxnField.xfer_asset: Gtxn[2].assets[0], 
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