import { Bucket, File as GoogleFile } from "@google-cloud/storage";
import { GoogleCloudConfig } from "../helpers";

export const getUrl = async (name: string, type: string, storage: Bucket, bucketName?: string) => {
    try {
        if (!bucketName) {
            throw new Error("Bucket name is not provided");
        }

        const options = {
            version: "v4" as "v4",
            action: "write" as "write",
            expires: Date.now() + 15 * 60 * 1000,
            contentType: type,
        };

        const [url] = await storage.file(name).getSignedUrl(options);
        console.log({ type, url });

        return url;
    } catch (err) {
        console.log(err);

        return err;
    }
};

export const getNamesWithPath = (files: GoogleFile[]) => {
    return files.map((file) => {
        const fullPath = file.name;
        const namesArray = fullPath.split("/");
        namesArray.shift();
        let nameWithPath = namesArray.join("/");
        if (nameWithPath[0] === "/") {
            nameWithPath = nameWithPath.replace(/^./, "");
        }
        return nameWithPath;
    });
};

export const getContents = async (params: { prefix: string }, storage: Bucket) => {
    try {
        const [files] = await storage.getFiles({ prefix: params.prefix });
        const contents = files.map((file) => file.name);
        console.log({ contents });

        return contents;
    } catch (err) {
        console.log(err);

        return err;
    }
};

export const getDicomFileList = async (
    patientId: string,
    storage: Bucket,
    bucketName?: string
): Promise<{ contents?: string[] }> => {
    if (!bucketName) {
        console.log("Bucket name does not exist");
        return {};
    }

    try {
        const contents = await getContents({ prefix: `${patientId}/` }, storage);
        console.log(contents);
        return { contents } as { contents: string[] };
    } catch (error) {
        console.error("Error fetching DICOM files:", error);
        return {};
    }
};

export const getDicomFileUrl = async (filePathKey: string, googleCloudConfig: GoogleCloudConfig, storage: Bucket) => {
    try {
        if (!googleCloudConfig.bucketName) {
            throw new Error("Bucket name is not provided");
        }

        const options = {
            version: "v4" as "v4",
            action: "read" as "read",
            expires: Date.now() + 15 * 60 * 1000,
        };

        const [url] = await storage.file(filePathKey).getSignedUrl(options);
        console.log("Presigned URL: ", url);
        return url;
    } catch (err) {
        console.error(err);
        return err;
    }
};
