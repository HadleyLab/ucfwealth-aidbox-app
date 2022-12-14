import * as dotenv from "dotenv";
dotenv.config();
import * as assert from "assert";
import { NotFoundError, ValidationError } from "@aidbox/node-server-sdk";
import { TOperation } from "./helpers";
import {
    getDicomFileUrl,
    getDicomFileList,
    getUrl,
} from "./fileUploader/index.js";
import axios from "axios";
import {
    associateAndTransferNFT,
    createHederaAccount,
    createNft,
} from "./fileUploader/hedera.js";

export const createPatient: TOperation<{
    // Typing "resource" (POST payload)
    resource: {
        name: string;
        active: boolean;
    };
    // Optionally typing query/route params & form payload
    params: {
        foo: string;
    };
    "form-params": {
        foo: string;
    };
    "route-params": {
        foo: string;
    };
}> = {
    method: "POST",
    path: ["createPatient"],
    handlerFn: async (req, { ctx }) => {
        const {
            // "resource" contains POST payload
            resource,
            // "params", "form-params" & "route-params" are also accessible
            params,
            "form-params": formParams,
            "route-params": routeParams,
        } = req;
        assert.ok(resource, new ValidationError("resource required"));
        const { active, name } = resource;

        assert.ok(
            typeof active !== "undefined",
            new ValidationError('"active" required')
        );
        assert.ok(name, new ValidationError('"name" required'));

        const patient = await ctx.api.createResource<any>("Patient", {
            active: active,
            name: [{ text: name }],
        });
        return { resource: patient };
    },
};

export const test: TOperation<{ resource: { active: boolean } }> = {
    method: "GET",
    path: ["test"],
    handlerFn: async (req, { ctx, helpers }) => {
        // Test helpers
        console.log("Testing helpers");
        const { resources: patients, total: patientsTotal } =
            await helpers.findResources<any>("Patient", {
                _sort: "-createdAt",
                _count: 3,
            });
        console.log({ patientsTotal, patients });
        console.log(await helpers.node);

        // Test log
        console.log("Testing log");
        await ctx.log({
            message: { error: "Testing log" },
            v: "2020.02",
            fx: "testOperation",
            type: "backend-test",
        });

        return { status: 200 };
    },
};

export const testError: TOperation<{ params: { type: string } }> = {
    method: "GET",
    path: ["testError"],
    handlerFn: async (req, { ctx }) => {
        switch (req.params.type) {
            case "ValidationError":
                throw new ValidationError("Testing ValidationError");
            case "NotFoundError":
                throw new NotFoundError("Something", {
                    foo: "foo",
                    bar: "bar",
                });
            case "AxiosError":
                await ctx.request({ url: "http://xxx" });
                return {};
            default:
                throw new Error("Testing default error");
        }
    },
};

export const testApi: TOperation<{ params: { type: string } }> = {
    method: "GET",
    path: ["testApi"],
    handlerFn: async (req, { ctx }) => {
        const { resources: patients } = await ctx.api.findResources<any>(
            "Patient"
        );

        const patient = !patients.length
            ? null
            : await ctx.api.getResource<any>("Patient", patients[0].id);

        console.log({ patients, patient });
        return { resource: { patients, patient } };
    },
};

export const testPsql: TOperation = {
    method: "GET",
    path: ["test-psql"],
    handlerFn: async (req, { ctx }) => {
        const result = await ctx.psql("select * from attribute limit 1");
        return { resource: result };
    },
};

export const testSql: TOperation = {
    method: "GET",
    path: ["test-sql"],
    handlerFn: async (req, { ctx }) => {
        const result = await ctx.sql(
            "select * from attribute where resource->>'module' = ? limit 1",
            ["fhir-4.0.0"]
        );
        console.log(result);
        return { resource: result };
    },
};

export const testBundle: TOperation = {
    method: "GET",
    path: ["test-bundle"],
    handlerFn: async (req, { ctx }) => {
        const result = await ctx.api.createBundle("batch", [
            {
                request: { method: "POST", url: "/Patient" },
                resource: { resourceType: "Patient" },
            },
        ]);
        console.log(result);
        return { resource: result };
    },
};

export const listPatientDicomFiles: TOperation = {
    method: "GET",
    path: ["$list-patient-dicom-files"],
    handlerFn: async (req, { ctx, helpers }) => {
        const patientId = req.params.patientId;
        const listDicomFiles = await getDicomFileList(
            patientId,
            helpers.s3,
            helpers.config.aws.bucketName
        );
        return { resource: { dicomFileList: listDicomFiles.contents } };
    },
};

export const getPngImageBase64: TOperation = {
    method: "GET",
    path: ["$get-png-image-base64"],
    handlerFn: async (req, { ctx, helpers }) => {
        const filePathKey = req.params.key;
        const presignedUrl = await getDicomFileUrl(
            filePathKey,
            helpers.config.aws
        );
        const params = {
            downloadUrl: presignedUrl,
        };
        const response = await axios.get(
            process.env.DCM_TO_PNG_URL + "/get-png-image-base64",
            { params }
        );
        return { resource: response.data };
    },
};

export const downloadDicomFile: TOperation = {
    method: "GET",
    path: ["$download-dicom-file"],
    handlerFn: async (req, { ctx, helpers }) => {
        const filePathKey = req.params.key;
        const presignedUrl = await getDicomFileUrl(
            filePathKey,
            helpers.config.aws
        );
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
        const url = await getUrl(
            name,
            type,
            helpers.s3,
            helpers.config.aws.bucketName
        );
        return { resource: { url } };
    },
};

export const apiGetData: TOperation = {
    method: "GET",
    path: ["api", "get-data"],
    handlerFn: async (req, { ctx, helpers }) => {
        const patientId = req.params.sessionId;
        const contents = await getDicomFileList(
            patientId,
            helpers.s3,
            helpers.config.aws.bucketName
        );
        return { resource: { contents } };
    },
};

export const apiCreateHederaAccount: TOperation = {
    method: "GET",
    path: ["api", "create-hedera-account"],
    handlerFn: async (req, { ctx, helpers }) => {
        const hederaAccount = await createHederaAccount(helpers.hederaClient);
        return { resource: { hederaAccount } };
    },
};

export const apiSetInProgressCreateNft: TOperation = {
    method: "GET",
    path: ["$set-in-progress-create-nft"],
    handlerFn: async (req, { ctx, helpers }) => {
        const patientId = req.params.patientId;
        const { resources } = await helpers.findResources<any>(
            "ResultCreationNft",
            {
                _ilike: patientId,
            }
        );
        if (resources.length === 0) {
            await ctx.api.createResource<any>("ResultCreationNft", {
                status: "in-progress",
                patient: { id: patientId, resourceType: "Patient" },
                id: patientId,
            });
        } else {
            await ctx.api.patchResource<any>("ResultCreationNft", patientId, {
                status: "in-progress",
                patient: { id: patientId, resourceType: "Patient" },
                id: patientId,
            });
        }
        return { resource: { status: "in-progress" } };
    },
};

export const apiCreateNft: TOperation = {
    method: "GET",
    path: ["$create-nft"],
    handlerFn: async (req, { ctx, helpers }) => {
        const patientId = req.params.patientId;
        const { resources: hederaAccount, total } =
            await helpers.findResources<any>("HederaAccount", {
                _ilike: patientId,
            });
        const hederaAccountId = hederaAccount[0].accountId;
        const hederaAccountKey = hederaAccount[0].accountKey;
        const runCreateNftProcess = async () => {
            if (!helpers.config.dicomToPngUrl) {
                console.error("Dicom to png url is missed");
                return { status: 500 };
            }
            const { tokenId, CID } = await createNft(
                patientId,
                await helpers.node,
                helpers.s3,
                helpers.hederaClient,
                helpers.config.hedera.hederaTreasuryId,
                helpers.config.hedera.hederaTreasuryKey,
                helpers.config.aws,
                helpers.config.dicomToPngUrl
            );
            if (!tokenId) {
                return { status: 500 };
            }
            await associateAndTransferNFT(
                tokenId,
                hederaAccountId,
                hederaAccountKey,
                CID,
                helpers.config.hedera.hederaTreasuryId,
                helpers.config.hedera.hederaTreasuryKey,
                helpers.hederaClient
            );
            await ctx.api.patchResource<any>("ResultCreationNft", patientId, {
                status: "completed",
                patient: { id: patientId, resourceType: "Patient" },
                id: patientId,
            });
        };
        runCreateNftProcess();
        return {
            resource: { text: `Creating an NFT for a patient ${patientId}` },
        };
    },
};
