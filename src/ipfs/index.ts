import axios from "axios";
import { IPFS } from "ipfs-core";
import { getDicomFileList, getDicomFileUrl } from "../fileUploader/index.js";
import { AwsConfig } from "../helpers.js";

const getDownloadFileUrl = async (
    patientId: string,
    dicomFileName: string,
    awsConfig: AwsConfig
) => {
    const filePathKey = `${patientId}/${dicomFileName}`;
    const presignedUrl = await getDicomFileUrl(filePathKey, awsConfig);
    return presignedUrl;
};

const getDcmFileNamesWithUrls = (
    patientId: string,
    dicomFileList: string[],
    awsConfig: AwsConfig
) => {
    const dcmFileNamesWithUrls = dicomFileList.map(async (dicomFileName) => {
        const downloadUrl = await getDownloadFileUrl(
            patientId,
            dicomFileName,
            awsConfig
        );
        return {
            fileName: dicomFileName,
            downloadUrl: downloadUrl,
        };
    });
    return Promise.all(dcmFileNamesWithUrls);
};

const addFileToIpfs = async (
    patientId: string,
    file: { fileName: string; downloadUrl: string },
    node: IPFS,
    dicomToPngUrl: string
) => {
    const { fileName, downloadUrl } = file;

    const config = {
        method: "GET",
        url: `${dicomToPngUrl}/get-png-image`,
        params: { downloadUrl },
        responseType: "stream" as "stream",
    };
    const response = await axios(config);
    const imageAddResult = await node.add({
        path: fileName,
        content: response.data,
    });
    const fileHash = imageAddResult.cid;
    const meta = {
        name: "test" + fileName,
        creator: patientId,
        creatorDID: "DID URI",
        description: "human readable description of the asset - RECOMMENDED",
        image: "https://ipfs.io/ipfs/" + String(fileHash),
        type: "mime type - ie image/jpeg - CONDITIONALLY OPTIONAL ",
        files: [
            {
                uri: "https://ipfs.io/ipfs/" + String(fileHash),
                type: "mime type",
                metadata: "metadata object - OPTIONAL",
                metadata_uri: "uri to metadata - OPTIONAL",
            },
        ],
        format: "format designation",
    };
    const metaAddResult = await node.add(JSON.stringify(meta));
    return metaAddResult.cid.toString();
};

const addFilesToIpfs = (
    patientId: string,
    dcmFileNamesWithUrls: { fileName: string; downloadUrl: string }[],
    node: IPFS,
    dicomToPngUrl: string
) => {
    const response = dcmFileNamesWithUrls.map((file) =>
        addFileToIpfs(patientId, file, node, dicomToPngUrl)
    );
    return Promise.all(response);
};

export const getCidArray = async (
    patientId: string,
    node: IPFS,
    s3: AWS.S3,
    awsConfig: AwsConfig,
    dicomToPngUrl: string
) => {
    const dicomFileList = await getDicomFileList(
        patientId,
        s3,
        awsConfig.bucketName
    );
    const dcmFileNamesWithUrls = await getDcmFileNamesWithUrls(
        patientId,
        dicomFileList.contents,
        awsConfig
    );
    const response = await addFilesToIpfs(
        patientId,
        dcmFileNamesWithUrls,
        node,
        dicomToPngUrl
    );
    return response;
};
