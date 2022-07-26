# Assessment on Algorand Smart Contracts
In this assessment, complete the dapp to allow users to connect their wallet accounts and purchase TESLA coins. You will also need to deploy the contracts required to mint and transfer the coins.

#### TESLA coin details
- total amount: 1000000
- decimals: 0
- asset name: Tesla
- asset unit name: TSLA
- manager: -
- clawback : -
- freeze: -
- reserve: -

## Stateful smart contracts

#### Basic checks for all smart contracts
1. `rekey to`, `close remainder to`, `asset close to` addresses are not found in the transactions.

### Minting Contract
Complete the stateful smart contract `assets/mint_approval.py` which allows only the contract creator to mint, transfer and burn TESLA coins. These are the following features required for each function,

#### Minting
1. Prevent double asset creation.
2. Create TESLA asset on contract initialization.

#### Transfer
1. Enough supply to conduct asset transfer.
2. Asset must be created before calling this function.
3. Transfer TESLA coins to holding contract.

#### Burn
1. Enough supply to conduct asset transfer.
2. Transfer TESLA coins to burn contract.

### Holdings Contract
Complete the stateful smart contract `assets/holdings_approval.py` which allows the opt in users to purchase TESLA coins at the cost of 1 TSLA = 5 Algos. Contract creator can update the price if necessary.

#### Init
1. Saves asset ID and current purchase price in global state.

#### Update price
1. Contract creator function.
2. Saves the updated price in global state.

#### Sell tokens
1. Check receiver's coin balance and existing supply before selling tokens.
2. Transaction that calls this function should be an grouped transaction which consists of a payment and an app call.
2. Payment amount should include transaction fees and payment for the TESLA coins.

### Burn Contract
Complete the stateful smart contract `assets/burn_approval.py` which allows contract creator to send TESLA coins to it. This contract should not allow anyone to transfer coins out of it.

## Contract deployment flow
1. Deploy the minting contract to create the TESLA coin.
2. Fund minting contract with algos to perform asset transfer.
3. Deploy the holding contract with the asset ID and purchase price.
4. Deploy the burn contract.
5. Perform asset opt in for holding and burn contracts.

Complete the server side scripts to allow creator to update prices, transfer and burn supply.

## Frontend interaction
This repository contains a VueJS frontend with some basic wallet integration. It displays a form which allows connected account to request for TESLA coins in a simple HTML form. Feel free to replace this with ReactJS (or any other JS frontend frameworks) if you wish. However, the completed app should do the following,

1. Allow user to successfully buy TESLA coins.
2. Display remaining TESLA coins in the holding contract.

## Testing
Write test cases to cover the successful contract deployment, as well as negative tests.

## Deployment
Your application should be able to connect to AlgoSigner (localhost) and allow the connected account to buy tokens from the holdings contract. As an added bonus, try to deploy your application to TestNet as well.

## Setup instructions

### 1. Install packages
```
yarn install
```

### 2. Update environement variables
1. Copy `.env.example` to `.env`.
2. Update credentials in `.env` file.

### 3. Algo Builder deployment commands
```
# Run all deployment scripts
yarn run algob deploy

# Run one deployment script
yarn run algob deploy scripts/<filename>

# Run non deployment scripts
yarn run algob run scripts/path/to/filename

# Clear cache
yarn run algob clean

# Run tests
yarn run algob test

# Run dapp on localhost
yarn serve
```
