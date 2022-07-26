from pyteal import *

def holdings_clearstate():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(holdings_clearstate(), mode=Mode.Application, version=6))