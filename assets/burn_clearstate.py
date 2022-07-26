from pyteal import *

def burn_clearstate():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(burn_clearstate(), mode=Mode.Application, version=6))