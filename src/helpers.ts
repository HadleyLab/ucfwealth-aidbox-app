import {
    Ctx,
    ManifestOperation,
    ManifestSubscription,
    OperationRequestType,
    Resource,
} from "@aidbox/node-server-sdk";
import { AccountId, Client, PrivateKey } from "@hashgraph/sdk";
import AWS from "aws-sdk";
import { create, IPFS } from "ipfs-core";

export interface AwsConfig {
    bucketName?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const dicomToPngUrl = process.env.DCM_TO_PNG_URL;
const hederaAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
const hederaAccountKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY!);
const hederaTreasuryId = AccountId.fromString(process.env.HEDERA_TREASURY_ID!);
const hederaTreasuryKey = PrivateKey.fromString(
    process.env.HEDERA_TREASURY_KEY!
);

export type THelpers = {
    findResources<R extends Resource>(
        resourceType: string,
        params: Record<string, string | number>
    ): Promise<{ resources: R[]; total: number }>;
    getResource<R extends Resource>(
        resourceType: string,
        resourceId: string
    ): Promise<R>;
    node: Promise<IPFS>;
    hederaClient: Client;
    s3: AWS.S3;
    config: {
        aws: {
            bucketName?: string;
            region?: string;
            accessKeyId?: string;
            secretAccessKey?: string;
        };
        hedera: {
            hederaAccountId: AccountId;
            hederaAccountKey: PrivateKey;
            hederaTreasuryId: AccountId;
            hederaTreasuryKey: PrivateKey;
        };
        dicomToPngUrl?: string;
    };
};

const initIPFS = async () => {
    const node = await create({ repo: process.env.IPFS_PATH });
    const version = await node.version();
    console.log("ipfs run version", version.version);
    return node;
};

export const createHelpers = async (ctx: Ctx): Promise<THelpers> => {
    const node = initIPFS();

    AWS.config.update({
        region,
        accessKeyId,
        secretAccessKey,
    });

    const s3 = new AWS.S3();

    const hederaClient = Client.forTestnet().setOperator(
        hederaAccountId,
        hederaAccountKey
    );

    return {
        findResources: async <R extends Resource>(
            resourceType: string,
            params: Record<string, string | number>
        ) => {
            const {
                data: { entry, total },
            } = await ctx.request<{ entry: { resource: R }[]; total: number }>({
                url: `/${resourceType}`,
                params,
            });
            return { resources: entry.map((e: any) => e.resource), total };
        },
        getResource: async <R extends Resource>(
            resourceType: string,
            resourceId: string
        ) => {
            const { data: resource } = await ctx.request<R>({
                url: `/${resourceType}/${resourceId}`,
            });
            return resource;
        },
        node,
        hederaClient,
        s3,
        config: {
            aws: {
                bucketName,
                region,
                accessKeyId,
                secretAccessKey,
            },
            hedera: {
                hederaAccountId,
                hederaAccountKey,
                hederaTreasuryId,
                hederaTreasuryKey,
            },
            dicomToPngUrl,
        },
    };
};

//

export type TOperation<T extends OperationRequestType = any> =
    ManifestOperation<T, THelpers>;

export type TSubscription<T extends Resource = any> = ManifestSubscription<
    T,
    THelpers
>;
