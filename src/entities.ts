export const HederaAccount = {
    attrs: {
        patientId: { type: "string" },
        accountId: { type: "string" },
        accountKey: { type: "string" },
    },
};

export const QuestionnaireSettings = {
    attrs: {
        personalInfo: { type: "string" },
        questionnaireList: { type: "string" },
    },
};

export const PatientSettings = {
    attrs: {
        patientId: { type: "string" },
        selectedQuestionnaire: { type: "string" },
    },
};
