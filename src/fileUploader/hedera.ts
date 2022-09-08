import { Buffer } from "buffer";

import {
    AccountBalanceQuery,
    AccountCreateTransaction,
    AccountId,
    Client,
    CustomFixedFee,
    CustomRoyaltyFee,
    Hbar,
    PrivateKey,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenId,
    TokenInfoQuery,
    TokenMintTransaction,
    TokenSupplyType,
    TokenType,
    TransferTransaction,
} from "@hashgraph/sdk";
import { getCidArray } from "../ipfs/index.js";
import { IPFS } from "ipfs-core";
import { AwsConfig } from "../helpers.js";

const adminKey = PrivateKey.generate();
const supplyKey = PrivateKey.generate();
const freezeKey = PrivateKey.generate();
const wipeKey = PrivateKey.generate();

export const createHederaAccount = async (hederaClient: Client) => {
    const newAccountPrivateKey = await PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;
    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(0))
        .execute(hederaClient);
    const getReceipt = await newAccount.getReceipt(hederaClient);
    const newAccountId = getReceipt.accountId!;
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(hederaClient);
    console.log("The new account ID is: " + newAccountId);
    console.log("The new account PKey is: " + newAccountPrivateKey);
    console.log(
        "The new account balance is: " +
            accountBalance.hbars.toTinybars() +
            " tinybar."
    );
    return {
        accountId: String(newAccountId),
        accountKey: String(newAccountPrivateKey),
    };
};

export const createNft = async (
    patientId: string,
    node: IPFS,
    s3: AWS.S3,
    hederaClient: Client,
    hederaTreasuryId: string | AccountId,
    hederaTreasuryKey: PrivateKey,
    awsConfig: AwsConfig,
    dicomToPngUrl: string
) => {
    // DEFINE CUSTOM FEE SCHEDULE
    const nftCustomFee = new CustomRoyaltyFee()
        .setNumerator(5)
        .setDenominator(10)
        .setFeeCollectorAccountId(hederaTreasuryId)
        .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(1)));

    // IPFS CONTENT IDENTIFIERS FOR WHICH WE WILL CREATE NFTs
    const CID = (await getCidArray(patientId, node, s3, awsConfig, dicomToPngUrl)) as string[];

    console.log("CID array:", CID);

    // CREATE NFT WITH CUSTOM FEE
    const nftCreate = await new TokenCreateTransaction()
        .setTokenName(patientId)
        .setTokenSymbol(patientId.substring(0, 8))
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(hederaTreasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(CID.length)
        .setCustomFees([nftCustomFee])
        .setAdminKey(adminKey)
        .setSupplyKey(supplyKey)
        // .setPauseKey(pauseKey)
        .setFreezeKey(freezeKey)
        .setWipeKey(wipeKey)
        .freezeWith(hederaClient)
        .sign(hederaTreasuryKey);

    const nftCreateTxSign = await nftCreate.sign(adminKey);

    const nftCreateSubmit = await nftCreateTxSign.execute(hederaClient);

    const nftCreateRx = await nftCreateSubmit.getReceipt(hederaClient);

    const tokenId = nftCreateRx.tokenId;

    console.log(`Created NFT with Token ID: ${tokenId?.toString()} \n`);

    // TOKEN QUERY TO CHECK THAT THE CUSTOM FEE SCHEDULE IS ASSOCIATED WITH NFT
    let tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId!)
        .execute(hederaClient);
    console.table(tokenInfo.customFees[0]);

    // MINT NEW BATCH OF NFTs
    const nftFiles = [];
    for (let i = 0; i < CID.length; i++) {
        nftFiles[i] = await tokenMinterFcn(CID[i], tokenId, hederaClient);
        console.log(
            `Created NFT ${tokenId?.toString()} with serial: ${nftFiles[
                i
            ].serials[0].toString()}`
        );
    }

    tokenInfo = await new TokenInfoQuery()
        .setTokenId(tokenId!)
        .execute(hederaClient);
    console.log(`Current NFT supply: ${tokenInfo.totalSupply.toString()} \n`);

    return { tokenId, CID };
};

export const associateUserAccountWithNFT = async (
    tokenId: TokenId,
    patientAccountId: AccountId,
    patientAccountKey: PrivateKey,
    hederaClient: Client
) => {
    let key = patientAccountKey;
    if (typeof patientAccountKey === "string") {
        key = PrivateKey.fromString(patientAccountKey);
    }
    // Create the associate transaction and sign with patient's key
    const associatePatientTx = await new TokenAssociateTransaction()
        .setAccountId(patientAccountId)
        .setTokenIds([tokenId])
        .freezeWith(hederaClient)
        .sign(key);
    // Submit the transaction to a Hedera network
    const associatePatientTxSubmit = await associatePatientTx.execute(
        hederaClient
    );
    // Get the transaction receipt
    const associatePatientRx = await associatePatientTxSubmit.getReceipt(
        hederaClient
    );
    // Confirm the transaction was successful
    console.log(
        `- NFT association with patient's account: ${associatePatientRx.status}\n`
    );
};

export const transferNFT = async (
    tokenId: TokenId,
    patientAccountId: AccountId,
    CID: string[] | string,
    hederaTreasuryId: string | AccountId,
    hederaTreasuryKey: PrivateKey,
    hederaClient: Client
) => {
    for (let i = 1; i < CID.length + 1; i++) {
        const tokenSerial = i;
        const tokenTransferTx = await new TransferTransaction()
            .addNftTransfer(
                tokenId,
                tokenSerial,
                hederaTreasuryId,
                patientAccountId
            )
            .freezeWith(hederaClient)
            .sign(hederaTreasuryKey);
        const tokenTransferSubmit = await tokenTransferTx.execute(hederaClient);
        const tokenTransferRx = await tokenTransferSubmit.getReceipt(
            hederaClient
        );
        console.log(
            `\n NFT transfer Treasury->Patient status: ${tokenTransferRx.status.toString()} \n`
        );
    }
};

export const patientBalanceCheck = async (
    patientAccountId: AccountId,
    tokenId: TokenId,
    hederaClient: Client
) => {
    async function bCheckerFcn(id: AccountId) {
        const balanceCheckTx = await new AccountBalanceQuery()
            .setAccountId(id)
            .execute(hederaClient);
        return [
            balanceCheckTx.tokens?._map.get(tokenId.toString()),
            balanceCheckTx.hbars,
        ];
    }
    const patientBalance = await bCheckerFcn(patientAccountId);
    console.log(
        `- Patient balance: ${patientBalance[0]?.toString()} NFTs of ID:${tokenId.toString()} and ${patientBalance[1]?.toString()}`
    );
};

const tokenMinterFcn = async (
    CID: string[] | string,
    tokenId: TokenId | null,
    hederaClient: Client
) => {
    const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId!)
        .setMetadata([Buffer.from(CID as any)])
        .freezeWith(hederaClient);
    const mintTxSign = await mintTx.sign(supplyKey);
    const mintTxSubmit = await mintTxSign.execute(hederaClient);
    return mintTxSubmit.getReceipt(hederaClient);
};

export const associateAndTransferNFT = async (
    tokenId: TokenId,
    patientAccountId: string,
    patientAccountKey: string,
    CID: string[] | string,
    hederaTreasuryId: string | AccountId,
    hederaTreasuryKey: PrivateKey,
    hederaClient: Client
) => {
    const accountId = AccountId.fromString(patientAccountId);
    const accountKey = PrivateKey.fromString(patientAccountKey);
    console.log('associate user account with NFT in progress')
    await associateUserAccountWithNFT(
        tokenId,
        accountId,
        accountKey,
        hederaClient
    );
    console.log('transfer NFT in progress')
    await transferNFT(
        tokenId,
        accountId,
        CID,
        hederaTreasuryId,
        hederaTreasuryKey,
        hederaClient
    );
    console.log('associate user account with NFT and transfer completed')
    await patientBalanceCheck(accountId, tokenId, hederaClient);
    return;
};
