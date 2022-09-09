export const HederaAccount = {
    attrs: {
        patient: {
            type: "Reference",
            search: { name: "patient", type: "reference" },
            isRequired: true,
            refers: ["Patient"],
        },
        accountId: { type: "string" },
        accountKey: { type: "string" },
    },
};

export const PatientSettings = {
    attrs: {
        patient: {
            type: "Reference",
            search: { name: "patient", type: "reference" },
            isRequired: true,
            refers: ["Patient"],
        },
        questionnaire: {
            type: "Reference",
            search: { name: "questionnaire", type: "reference" },
            isRequired: true,
            refers: ["Questionnaire"],
        },
    },
};

export const ResultCreationNft = {
    attrs: {
        status: { type: "string", enum: ["in-progress", "completed"] },
        patient: {
            type: "Reference",
            search: { name: "patient", type: "reference" },
            isRequired: true,
            refers: ["Patient"],
        },
    },
};
