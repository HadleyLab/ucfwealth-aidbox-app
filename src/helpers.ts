import { Ctx, ManifestOperation, ManifestSubscription, OperationRequestType, Resource } from "@aidbox/node-server-sdk";
import { Storage, Bucket } from "@google-cloud/storage";

const dicomToPngUrl = process.env.DCM_TO_PNG_URL;
const googleProjectId = process.env.GOOGLE_PROJECT_ID;
const googleBucketName = process.env.GOOGLE_BUCKET_NAME;

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
    storage: Bucket;
    config: {
        googleCloud: GoogleCloudConfig;
        dicomToPngUrl?: string;
    };
};

export const createHelpers = async (ctx: Ctx): Promise<THelpers> => {
    const storage = new Storage({
        projectId: googleProjectId,
    });

    const bucket = storage.bucket(googleBucketName!);

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
        storage: bucket,
        config: {
            googleCloud: {
                projectId: googleProjectId,
                bucketName: googleBucketName,
            },
            dicomToPngUrl,
        },
    };
};

//

export type TOperation<T extends OperationRequestType = any> = ManifestOperation<T, THelpers>;

export type TSubscription<T extends Resource = any> = ManifestSubscription<T, THelpers>;
