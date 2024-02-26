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
