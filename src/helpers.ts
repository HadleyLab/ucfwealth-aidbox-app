import { Ctx, ManifestOperation, ManifestSubscription, OperationRequestType, Resource } from "@aidbox/node-server-sdk";
import { Storage, Bucket } from "@google-cloud/storage";
//@ts-ignore
import { create, IPFS } from "ipfs-core";

const dicomToPngUrl = process.env.DCM_TO_PNG_URL;
const googleProjectId = "googleProjectId";
const googleBucketName = "googleBucketName";
const googleKeyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

export type GoogleCloudConfig = {
    projectId?: string;
    bucketName?: string;
    keyFilename?: string;
};

export type THelpers = {
    findResources<R extends Resource>(
        resourceType: string,
        params: Record<string, string | number>
    ): Promise<{ resources: R[]; total: number }>;
    getResource<R extends Resource>(resourceType: string, resourceId: string): Promise<R>;
    node: Promise<IPFS>;
    storage: Bucket;
    config: {
        googleCloud: GoogleCloudConfig;
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

    const storage = new Storage({
        projectId: googleProjectId,
        keyFilename: googleKeyFilename,
    });

    const bucket = storage.bucket(googleBucketName);

    return {
        findResources: async <R extends Resource>(resourceType: string, params: Record<string, string | number>) => {
            const {
                data: { entry, total },
            } = await ctx.request<{ entry: { resource: R }[]; total: number }>({
                url: `/${resourceType}`,
                params,
            });
            return { resources: entry.map((e: any) => e.resource), total };
        },
        getResource: async <R extends Resource>(resourceType: string, resourceId: string) => {
            const { data: resource } = await ctx.request<R>({
                url: `/${resourceType}/${resourceId}`,
            });
            return resource;
        },
        node,
        storage: bucket,
        config: {
            googleCloud: {
                projectId: googleProjectId,
                bucketName: googleBucketName,
                keyFilename: googleKeyFilename,
            },
            dicomToPngUrl,
        },
    };
};

//

export type TOperation<T extends OperationRequestType = any> = ManifestOperation<T, THelpers>;

export type TSubscription<T extends Resource = any> = ManifestSubscription<T, THelpers>;
