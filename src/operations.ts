import * as dotenv from "dotenv";
dotenv.config();
import { TOperation } from "./helpers";
import { getDicomFileUrl, getDicomFileList, getUrl } from "./fileUploader/index.js";
import axios from "axios";

export const listPatientDicomFiles: TOperation = {
    method: "GET",
    path: ["$list-patient-dicom-files"],
    handlerFn: async (req, { ctx, helpers }) => {
        const patientId = req.params.patientId;
        const listDicomFiles = await getDicomFileList(
            patientId,
            helpers.storage,
            helpers.config.googleCloud.bucketName
        );
        return { resource: { dicomFileList: listDicomFiles.contents } };
    },
};

export const getPngImageBase64: TOperation = {
    method: "GET",
    path: ["$get-png-image-base64"],
    handlerFn: async (req, { ctx, helpers }) => {
        const filePathKey = req.params.key;
        const presignedUrl = await getDicomFileUrl(filePathKey, helpers.config.googleCloud, helpers.storage);
        const params = {
            downloadUrl: presignedUrl,
        };
        const response = await axios.get(process.env.DCM_TO_PNG_URL + "/get-png-image-base64", { params });
        return { resource: response.data };
    },
};

export const downloadDicomFile: TOperation = {
    method: "GET",
    path: ["$download-dicom-file"],
    handlerFn: async (req, { ctx, helpers }) => {
        const filePathKey = req.params.key;
        const presignedUrl = await getDicomFileUrl(filePathKey, helpers.config.googleCloud, helpers.storage);
        return { resource: { result: "success", url: presignedUrl } };
    },
};

export const apiSign: TOperation = {
    method: "GET",
    path: ["api", "sign"],
    handlerFn: async (req, { ctx, helpers }) => {
        const name = req.params.name;
        const type = req.params.type;
        if (typeof name !== "string") {
            return { resource: { error: "Invalid name" } };
        }
        if (typeof type !== "string") {
            return { resource: { error: "Invalid type" } };
        }
        const url = await getUrl(name, type, helpers.storage, helpers.config.googleCloud.bucketName);
        return { resource: { url } };
    },
};

export const apiGetData: TOperation = {
    method: "GET",
    path: ["api", "get-data"],
    handlerFn: async (req, { ctx, helpers }) => {
        const patientId = req.params.sessionId;
        const contents = await getDicomFileList(patientId, helpers.storage, helpers.config.googleCloud.bucketName);
        if (Array.isArray(contents.contents)) {
            return { resource: { contents } };
        } else {
            console.error(contents);
            return { status: 500 };
        }
    },
};
