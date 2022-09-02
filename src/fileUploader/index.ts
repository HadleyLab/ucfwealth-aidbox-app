import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { AwsConfig } from "../helpers";

interface Params {
    Bucket: string;
    Prefix: string;
}

const signedUrlExpireSeconds = 60 * 5;

export const getUrl = async (
    name: string,
    type: string,
    s3: AWS.S3,
    bucketName?: string
) => {
    try {
        const url = await s3.getSignedUrlPromise("putObject", {
            Bucket: bucketName,
            Key: name,
            Expires: signedUrlExpireSeconds,
            ContentType: type,
        });
        console.log({ type: type });
        console.log({ url });

        return url;
    } catch (err) {
        console.log(err);

        return err;
    }
};

export const getNamesWithPath = (data: AWS.S3.ListObjectsV2Output) => {
    if (data === null) {
        return;
    }
    return data
        .Contents!.map((file: { Key?: string }) => file.Key)
        .map((fullPath?: string) => {
            if (fullPath) {
                const namesArray = fullPath.split("/");
                namesArray.shift();
                let nameWithPath = namesArray.join("/");
                if (nameWithPath[0] === "/") {
                    nameWithPath = nameWithPath.replace(/^./, "");
                }
                return nameWithPath;
            } else return "";
        });
};

export const getContents = async (params: Params, s3: AWS.S3) => {
    try {
        const contents = await new Promise<any>((resolve, reject) => {
            const result: string[][] = [];
            s3.listObjectsV2(params).eachPage(function (err, data) {
                if (err) reject(err);
                result.push(getNamesWithPath(data)!);
                if (data !== null && data.IsTruncated === false) {
                    resolve(result.flat());
                }
                return true;
            });
        });
        console.log({ contents });

        return contents;
    } catch (err) {
        console.log(err);

        return err;
    }
};

export const getDicomFileList = async (
    patientId: string,
    s3: AWS.S3,
    bucketName?: string
) => {
    if (!bucketName) {
        console.log("Bucket name does not exist");
        return {};
    }
    const params = {
        Bucket: bucketName,
        Prefix: `${patientId}/`,
    };

    const contents = await getContents(params, s3);
    console.log(contents);
    return { contents };
};

export const getDicomFileUrl = async (
    filePathKey: string,
    awsConfig: AwsConfig,
) => {
    const s3Configuration: S3ClientConfig = {
        credentials: {
            accessKeyId: String(awsConfig.accessKeyId),
            secretAccessKey: String(awsConfig.secretAccessKey),
        },
        region: awsConfig.region,
    };
    console.log("region", awsConfig.region);
    const s3 = new S3Client(s3Configuration);
    const command = new GetObjectCommand({
        Bucket: awsConfig.bucketName,
        Key: filePathKey,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 15 * 60 });
    console.log("Presigned URL: ", url);
    return url;
};
