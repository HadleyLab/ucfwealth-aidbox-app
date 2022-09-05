import * as dotenv from "dotenv";
dotenv.config()

const super_admin_policy = {
    engine: "json-schema",
    schema: {
        required: ["user"],
        properties: {
            user: {
                anyOf: [
                    {
                        required: ["id"],
                        properties: { id: { constant: "admin" } },
                    },
                    {
                        required: ["data"],
                        properties: { data: { required: ["superAdmin"] } },
                    },
                ],
            },
        },
    },
};

const patient_policy = {
    engine: "json-schema",
    schema: {
        required: ["user"],
        properties: {
            user: {
                anyOf: [
                    {
                        required: ["id"],
                        properties: { id: { constant: "admin" } },
                    },
                    {
                        required: ["data"],
                        properties: { data: { required: ["patient"] } },
                    },
                ],
            },
        },
    },
};

const strict_access_policies = {
    super_admin: super_admin_policy,
    patient: patient_policy,
};

const access_policies = strict_access_policies;

export const AuthConfig = {
    app: {
        theme: {
            brand: "Hadley Lab",
            title: "Covidimaging",
            styleUrl: `${process.env.FRONTEND_URL}/aidbox.css`,
        },
    },
};

export const Client = {
    SPA: { secret: "123456", grant_types: ["password"] },
    "google-client": {
        auth: {
            authorization_code: {
                redirect_uri: `${process.env.FRONTEND_URL}/google-signin`,
            },
        },
        first_party: true,
        grant_types: ["authorization_code"],
    },
    discourse: {
        auth: {
            authorization_code: {
                redirect_uri: `${process.env.DISCOURSE_URL}/auth/oauth2_basic/callback`,
            },
        },
        first_party: true,
        grant_types: ["authorization_code"],
        secret: process.env.DISCOURSE_SECRET,
    },
    web: {
        auth: {
            implicit: { redirect_uri: `${process.env.FRONTEND_URL}/auth` },
        },
        first_party: true,
        grant_types: ["implicit"],
    },
};

export const AidboxConfig = {
    provider: {
        provider: { console: { type: "console" }, default: "console" },
    },
};

export const AccessPolicy = access_policies;

export const SearchParameter = {
    "User.email": {
        name: "email",
        type: "string",
        resource: { resourceType: "Entity", id: "User" },
        expression: [["email"]],
    },
};

export const QuestionnaireSettings = {
    active: {
        personalInfo: "personal-information",
        questionnaireList: "screening-questions patient-report-baseline",
        id: "active",
        resourceType: "QuestionnaireSettings",
    },
};

export const Mapping = {
    "patient-extract": {
        resourceType: "Mapping",
        id: "patient-extract",
        body: {
            type: "transaction",
            $let: {
                patientId:
                    "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='patientId').answer.children().string\").0",
                phoneNumber:
                    "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='personal-information').item.where(linkId='phone-q2').answer.value.string\").0",
                birthDate:
                    "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='personal-information').item.where(linkId='birthDate-q3').answer.value.date\").0",
                line: "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='personal-information').item.where(linkId='addrStreet-q4').answer.value.string\")",
                city: "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='personal-information').item.where(linkId='addrCity-q5').answer.value.string\").0",
                state: "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='personal-information').item.where(linkId='addrState-q6').answer.value.string\").0",
                zip: "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='personal-information').item.where(linkId='addrZip-q7').answer.value.integer\").0",
                imagingSites:
                    "$ fhirpath(\"QuestionnaireResponse.repeat(item).where(linkId='imaging-sites').item.answer\")",
            },
            $body: {
                entry: {
                    $call: "concat",
                    $args: [
                        {
                            $map: "$ imagingSites",
                            $as: ["site", "index"],
                            $body: {
                                $let: {
                                    siteName:
                                        "$ fhirpath(\"%context.item.where(linkId='name-of-site').answer.value.string\",site).0",
                                    siteLine:
                                        "$ fhirpath(\"%context.item.where(linkId='street-address-of-site').answer.value.string\",site)",
                                    siteCity:
                                        "$ fhirpath(\"%context.item.where(linkId='city').answer.value.string\",site).0",
                                    siteState:
                                        "$ fhirpath(\"%context.item.where(linkId='state').answer.value.string\",site).0",
                                    siteZip:
                                        "$ fhirpath(\"%context.item.where(linkId='zip-code').answer.value.integer\",site).0",
                                },
                                $body: {
                                    request: {
                                        url: '$ "/Organization?name=" + siteName + "&address-city=" + siteCity',
                                        method: "POST",
                                    },
                                    fullUrl: '$ "urn:uuid:" + index',
                                    resource: {
                                        resourceType: "Organization",
                                        name: "$ siteName",
                                        address: [
                                            {
                                                text: '$ siteLine.0 + ", " + siteCity + ", " + siteState + " " + toString(siteZip)',
                                                line: "$ siteLine",
                                                city: "$ siteCity",
                                                state: "$ siteState",
                                                postalCode:
                                                    "$ toString(siteZip)",
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                        [
                            {
                                request: {
                                    url: '$ "/Patient/" + patientId',
                                    method: "PATCH",
                                },
                                resource: {
                                    telecom: [
                                        {
                                            value: "$ phoneNumber",
                                            system: "phone",
                                        },
                                    ],
                                    birthDate: "$ birthDate",
                                    address: [
                                        {
                                            text: '$ line.0 + ", " + city + ", " + state + " " + toString(zip)',
                                            line: "$ line",
                                            city: "$ city",
                                            state: "$ state",
                                            postalCode: "$ toString(zip)",
                                        },
                                    ],
                                },
                            },
                        ],
                    ],
                },
            },
        },
    },
};

export const Questionnaire = {
    "personal-information": {
        meta: {
           profile: ["http://covidimaging.com/questionnaire"]
        },
        url: "personal-information",
        resourceType: "Questionnaire",
        id: "covid-19-personal-information",
        title: "Participant personal information",
        status: "active",
        launchContext: [
            {
                name: "LaunchPatient",
                type: "Patient",
            },
        ],
        mapping: [
            {
                resourceType: "Mapping",
                id: "patient-extract",
            },
        ],
        item: [
            {
                text: "Personal information",
                linkId: "personal-information",
                type: "group",
                item: [
                    {
                        linkId: "firstName-q0",
                        text: "First Name",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "lastName-q0",
                        text: "Last Name",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "sex-at-birth-q1",
                        text: "Select your sex at birth",
                        type: "choice",
                        required: true,
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "10052007",
                                        display: "Male",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "1086007",
                                        display: "Female",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "394744001",
                                        display: "Prefer not to say",
                                    },
                                },
                            },
                        ],
                    },
                    {
                        linkId: "phone-q2",
                        text: "Phone",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "birthDate-q3",
                        text: "Date of birth",
                        type: "date",
                        required: true,
                    },
                    {
                        linkId: "addrStreet-q4",
                        text: "Street Address",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "addrCity-q5",
                        text: "City",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "addrState-q6",
                        text: "State",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "addrZip-q7",
                        text: "Zip",
                        type: "integer",
                        required: true,
                    },
                ],
            },
        ],
    },
    "screening-questions": {
        url: "screening-questions",
        meta: {
           profile: ["http://covidimaging.com/questionnaire"]
        },
        resourceType: "Questionnaire",
        id: "screening-questions",
        title: "Pre encunter covid-19 screening questions",
        status: "active",
        launchContext: [
            {
                name: "LaunchPatient",
                type: "Patient",
            },
        ],
        mapping: [
            {
                resourceType: "Mapping",
                id: "patient-extract",
            },
        ],
        item: [
            {
                text: "Inclusion Criteria",
                linkId: "inclusion-criteria",
                type: "group",
                item: [
                    {
                        linkId: "covid-test-q1",
                        text: "Have you ever been tested for COVID-19? (includes diagnostic molecular and/or antibody test)",
                        type: "choice",
                        required: true,
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373066001",
                                        display: "Yes",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373067005",
                                        display: "No",
                                    },
                                },
                            },
                        ],
                    },
                    {
                        linkId: "18-years-old-q32",
                        text: "Are you at least 18 years old?",
                        type: "choice",
                        required: true,
                        enableWhen: [
                            {
                                question: "covid-test-q1",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373066001",
                                        display: "Yes",
                                    },
                                },
                            },
                        ],
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373066001",
                                        display: "Yes",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373067005",
                                        display: "No",
                                    },
                                },
                            },
                        ],
                    },
                    {
                        linkId: "chest-x-ray-q33",
                        text: "Have you had a chest x-ray completed to evaluate for COVID-19?",
                        type: "choice",
                        required: true,
                        enableWhen: [
                            {
                                question: "covid-test-q1",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373066001",
                                        display: "Yes",
                                    },
                                },
                            },
                            {
                                question: "18-years-old-q32",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373066001",
                                        display: "Yes",
                                    },
                                },
                            },
                        ],
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373066001",
                                        display: "Yes",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        system: "http://snomed.info/sct",
                                        code: "373067005",
                                        display: "No",
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            {
                text: "Informed Consent",
                linkId: "terms-group",
                type: "group",
                enableBehavior: "all",
                enableWhen: [
                    {
                        question: "covid-test-q1",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "http://snomed.info/sct",
                                code: "373066001",
                                display: "Yes",
                            },
                        },
                    },
                    {
                        question: "18-years-old-q32",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "http://snomed.info/sct",
                                code: "373066001",
                                display: "Yes",
                            },
                        },
                    },
                    {
                        question: "chest-x-ray-q33",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "http://snomed.info/sct",
                                code: "373066001",
                                display: "Yes",
                            },
                        },
                    },
                ],
                item: [
                    {
                        text: "Title of research study: \n  Crowdsourcing an open COVID-19 chest radiograph imaging repository for artificial intelligence research\n  Investigator: \n  Dexter Hadley, MD, PhD      \n  Co-investigators: \n  Amoy Fraser, PhD, Jennifer Horner, Rachna Sannegowda\n  Key Information: \n  The following is a short summary of this study to help you decide whether or not to be a part of this study. More detailed information is listed later on in this form.\n\n  Why am I being invited to take part in a research study?\n  We invite you to take part in a research study if you are an adult and you have had a molecular COVID-19 diagnostic test with either positive or negative results and a chest radiographic imaging performed in a US institution. Your imaging may have been for screening or diagnostic purposes and may have been either positive or negative for disease. In addition, you need to have an email account with access to a reliable internet connection or smartphone.\n\n  Why is this research being done?\n  The purpose of this study is to develop medical Artificial Intelligence (AI) that may improve our understanding of COVID-19 imaging which may facilitate new ways of detecting and treating disease. To do this, we will ask you to securely provide your consent for your chest X-rays and answer some questions about your health through a secure web application. This study represents one of the first research studies that engages patients to donate their imaging (chest X-rays) to develop medical AI\n\n  How long will the research last and what will I need to do?\n  Your data will remain available to the research team within the web portal unless you choose to withdraw from the study. Although your active participation will be completed upon completion of the survey and signing of the medical release(s), the research itself will be ongoing for an indefinite amount of time. Unless removed by you, your data will remain indefinitely in the repository for ongoing research. If you remove your data/delete your account, we will consider you to have withdrawn from the study. Your participation in this study will involve completing a single brief health survey and signing medical consent for the release of your chest X-rays to the study. More detailed information about the study procedures can be found under “What happens if I say yes, I want to be in this research?”\n",
                        linkId: "necessary actions to study",
                        type: "group",
                        item: [
                            {
                                linkId: "necessary actions-q8",
                                text: "Comprehension question: What will you need to do if you agree to take part in this study?",
                                type: "choice",
                                required: true,
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "not share",
                                                display:
                                                    "Not share your COVID-19 chest x-ray",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        text: "Is there any way being in this study could be bad for me?\nAlthough we will do our best to protect your personal information (see below), there is still a very small risk of loss of privacy. We will do our best to make sure that the personal information we collect about you is kept private and secure. This study will never sell, rent, or lease your personal or contact information without your consent. If we do make your information available to other research groups for the purpose of research only, the information will be de-identified and will not be traceable to you.. If information from this study is published or presented at scientific meetings or shared with other researchers, your name and other personal identifiers will never be used. Your personal information may be given out if required by law (e.g., to prevent possible injury to yourself or others).\nYour information will be transmitted and stored using very secure systems within government-regulated HIPAA privacy guidelines. We label your images and information only with a code, and we keep the key to the code in a password protected database. Only approved staff will be given the password. We use other safeguards at our facilities and for our information technology and systems to protect the privacy and security of your information. However, inherent in any web-based research platform is the possibility of public disclosure of your protected health information and any physical or psychological anxiety that may be associated with this possibility.\nFor more information about risks and side effects, please ask one of the researchers. You can reach Dr. Hadley at dexter.hadley@ucf.edu. If you want to speak to someone not directly involved in the research study, please contact the UCF Institutional Review Board at 407-823-2901.\nWill being in this study help me in any way?\nWe cannot promise any benefits to you or others from your taking part in this research. However, possible benefits include having access to your medical information across institutions in a single database that you may share with your healthcare provider either in person or through the portal. We hope that society will benefit from your participation – by participating, you will help us contribute to a better understanding of COVID-19, and we may find better ways to predict, prevent, and treat the virus. Participation in research is completely voluntary.\nWe will not provide you with information about your health status or clinical interpretation of your data from the study. This is a research study and is not clinical care. We do not provide medical services. However, you will receive standardized information about COVID-19 risk factors based on the imaging and surveys you provide through a personalized dashboard. Participation in this study does not in any way substitute for professional medical advice, diagnosis, or treatment that your doctor or other healthcare provider may give you. Always ask the advice of your healthcare provider if you have any questions about a medical condition. Do not disregard professional medical advice or delay in seeking care because of something you have read as part of this study. If you think you may have a medical emergency, please call your doctor or dial 911 immediately.\n",
                        linkId: "participant's benefits",
                        type: "group",
                        enableWhen: [
                            {
                                question: "necessary actions-q8",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "share",
                                        display:
                                            "Share your COVID-19 chest x-ray and complete a brief survey",
                                    },
                                },
                            },
                        ],
                        item: [
                            {
                                linkId: "benefits-q9",
                                text: "Comprehension question: What benefits are there for you do be in this study?",
                                type: "choice",
                                required: true,
                                enableWhen: [
                                    {
                                        question: "necessary actions-q8",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                ],
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no benefits",
                                                display:
                                                    "There are no benefits",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "benefits",
                                                display:
                                                    "Gaining access to your own imaging in a portable format and benefiting society by contributing to our understanding of COVID-19",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        text: "Detailed Information: \n  The following is more detailed information about this study in addition to the information listed above.\n\n  What should I know about a research study?\n  Someone will explain this research study to you.Whether or not you take part is up to you.You can choose not to take part.You can agree to take part and later change your mind.Your decision will not be held against you.You can ask all the questions you want before you decide.\n\n  Who can I talk to?\n  If you have questions, concerns, or complaints, or think the research has hurt you, talk to the research team: dexter.hadley@ucf.edu or call Dr. Dexter Hadley at 407-266-1520.\n  This research has been reviewed and approved by an Institutional Review Board (“IRB”). You may talk to them at 407-823-2901 or irb@ucf.edu if:\n  Your questions, concerns, or complaints are not being answered by the research team.\n  You cannot reach the research team.\n  You want to talk to someone besides the research team.\n  You have questions about your rights as a research subject.\n  You want to get information or provide input about this research.\n",
                        linkId: "communication with organizers",
                        type: "group",
                        enableWhen: [
                            {
                                question: "necessary actions-q8",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "share",
                                        display:
                                            "Share your COVID-19 chest x-ray and complete a brief survey",
                                    },
                                },
                            },
                            {
                                question: "benefits-q9",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "no benefits",
                                        display: "There are no benefits",
                                    },
                                },
                            },
                        ],
                        item: [
                            {
                                linkId: "communication-q10",
                                text: "Who can I talk to if I have questions about the study or my participation in this study?",
                                type: "choice",
                                required: true,
                                enableWhen: [
                                    {
                                        question: "necessary actions-q8",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                    {
                                        question: "benefits-q9",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no benefits",
                                                display:
                                                    "There are no benefits",
                                            },
                                        },
                                    },
                                ],
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "contact",
                                                display:
                                                    "Dr. Dexter Hadley or the UCF IRB",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no contacts",
                                                display:
                                                    "There is no one I can contact",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        text: "How many people will be studied?\n  We expect a maximum of 20,000 people will be in this research study.\n  What happens if I say yes, I want to be in this research?\n  Surveys\n  If you agree to participate in this study, you will be asked to complete a brief survey about your demographics and health using our web application. The survey will ask about your personal and demographic dataand your medical history (such as your smoking habits and your history of cancer, if any). The survey will be brief, and will take you about 10-15 minutes to fill out.\n  Data transfer and sync\n  If you agree to participate in this study, you will be asked to sign medical release(s) for your chest X-rays to be released to us by your imaging site(s). We will use your rinformation to initiate the transfer of your chest X-rays .  We use the MatrixRay (https://matrixray.com) service by Nautilus Medical for secure transfer of imaging and related electronic health records.\n  Personalized dashboard\n  Once you agree to participate in this study, you will have access to a personalized dashboard accessible through our web application portal. Here, your will be able to review all the imaging and medical records that we store for you. We will provide standardized assessments based on your chest X-rays and risk factors that you may find useful to understand your COVID-19 risk.\n  What happens if I say yes, but I change my mind later?\n  You can leave the research at any time. It will not be held against you.\n  To stop participating in the study, you may delete your account (including your images and data). If you delete your account, we will consider you as withdrawn from the study.\n",
                        linkId: "remove from study",
                        type: "group",
                        enableWhen: [
                            {
                                question: "necessary actions-q8",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "share",
                                        display:
                                            "Share your COVID-19 chest x-ray and complete a brief survey",
                                    },
                                },
                            },
                            {
                                question: "benefits-q9",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "no benefits",
                                        display: "There are no benefits",
                                    },
                                },
                            },
                            {
                                question: "communication-q10",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "contact",
                                        display:
                                            "Dr. Dexter Hadley or the UCF IRB",
                                    },
                                },
                            },
                        ],
                        item: [
                            {
                                linkId: "removeFromStudy-q11",
                                text: "If you decide you no longer want to be in this study, how can you remove yourself from the study?",
                                type: "choice",
                                required: true,
                                enableWhen: [
                                    {
                                        question: "necessary actions-q8",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                    {
                                        question: "benefits-q9",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no benefits",
                                                display:
                                                    "There are no benefits",
                                            },
                                        },
                                    },
                                    {
                                        question: "communication-q10",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "contact",
                                                display:
                                                    "Dr. Dexter Hadley or the UCF IRB",
                                            },
                                        },
                                    },
                                ],
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "withdraw",
                                                display:
                                                    "By deleting your account through your personalized dashboard in the web application portal",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no withdraw",
                                                display:
                                                    "I cannot withdraw from the study",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        text: "What happens to the information collected for the research?\n Efforts will be made to limit the use and disclosure of your personal information, including research study and medical records, to people who have a need to review this information. We cannot promise complete secrecy. Organizations that may inspect and copy your information include the IRB and approved staff members only.\n De-identified information collected during this research could be used for future research studies or distributed to another investigator for future research studies without your additional informed consent. PHI data will stay on our web servers, while de-identified data will be on Zenodo/GitHub in perpetuity or until you delete your account. The delete function will be available through your personalized dashboard on the application.\n Federal law provides additional protections of your medical records and related health information. These are described in an attached document.\n",
                        linkId: "participant data use",
                        type: "group",
                        enableWhen: [
                            {
                                question: "necessary actions-q8",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "share",
                                        display:
                                            "Share your COVID-19 chest x-ray and complete a brief survey",
                                    },
                                },
                            },
                            {
                                question: "benefits-q9",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "no benefits",
                                        display: "There are no benefits",
                                    },
                                },
                            },
                            {
                                question: "communication-q10",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "contact",
                                        display:
                                            "Dr. Dexter Hadley or the UCF IRB",
                                    },
                                },
                            },
                            {
                                question: "removeFromStudy-q11",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "withdraw",
                                        display:
                                            "By deleting your account through your personalized dashboard in the web application portal",
                                    },
                                },
                            },
                        ],
                        item: [
                            {
                                linkId: "dataUse-q12",
                                text: "My de-identified data may be used for future research without my additional consent unless I delete my account?",
                                type: "choice",
                                required: true,
                                enableWhen: [
                                    {
                                        question: "necessary actions-q8",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                    {
                                        question: "benefits-q9",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no benefits",
                                                display:
                                                    "There are no benefits",
                                            },
                                        },
                                    },
                                    {
                                        question: "communication-q10",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "contact",
                                                display:
                                                    "Dr. Dexter Hadley or the UCF IRB",
                                            },
                                        },
                                    },
                                    {
                                        question: "removeFromStudy-q11",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "withdraw",
                                                display:
                                                    "By deleting your account through your personalized dashboard in the web application portal",
                                            },
                                        },
                                    },
                                ],
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "true",
                                                display: "True",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "false",
                                                display: "False",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        text: "What else do I need to know?\n This research is being led by Dr. Dexter Hadley at the University of Central Florida College of Medicine.\n The limitations as to who may participate in this research are the same as those applied to who may receive chest x-rays. If your medical health history prohibits (or if your medical care team discourages) chest radiography, you should not participate in this research.\n If you are experiencing an emergency, call 911. If you believe you have been harmed as a result of participating in this study, it is important that you promptly tell the researcher(s) at the number listed above. UCF will assist you in obtaining necessary medical care. In general, this care will be billed to you or your insurance company.  UCF has no program to pay for medical care for research related injuries.\n Participation in the study will be free to you, although external charges may be accrued through use of cellular data and/or payment to your healthcare facilities for medical records release, when applicable. You can inquire about any potential costs to you by contacting your cell phone service and by speaking with your local healthcare facility about their procedures for obtaining pertinent medical records.\n You will not be paid for taking part in this study. Should compensation become available in the future through commercialization, you will be notified.\n By consenting to participate in this study, you do not waive any of your legal rights. Consenting means that you have been given information about this study and that you agree to participate in the study.\n You will be informed of any new information or changes in the study that may affect your willingness to continue in the study. If at any time you wish to withdraw from this study, you will not suffer any penalty or lose any benefits to which you are entitled. Your participation is completely voluntary and will not affect your enrollment in any health plan or access to benefits.\n\n Federal law provides additional protections of your medical records and related health information. These are described in an attached document.\n",
                        linkId: "paid to take study",
                        type: "group",
                        enableWhen: [
                            {
                                question: "necessary actions-q8",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "share",
                                        display:
                                            "Share your COVID-19 chest x-ray and complete a brief survey",
                                    },
                                },
                            },
                            {
                                question: "benefits-q9",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "no benefits",
                                        display: "There are no benefits",
                                    },
                                },
                            },
                            {
                                question: "communication-q10",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "contact",
                                        display:
                                            "Dr. Dexter Hadley or the UCF IRB",
                                    },
                                },
                            },
                            {
                                question: "removeFromStudy-q11",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "withdraw",
                                        display:
                                            "By deleting your account through your personalized dashboard in the web application portal",
                                    },
                                },
                            },
                            {
                                question: "dataUse-q12",
                                operator: "=",
                                answer: {
                                    Coding: {
                                        system: "https://www.covidimaging.com/terms-of-participation",
                                        code: "true",
                                        display: "True",
                                    },
                                },
                            },
                        ],
                        item: [
                            {
                                linkId: "paidStudy-q13",
                                text: "Will you be paid to take part in this study?",
                                type: "choice",
                                required: true,
                                enableWhen: [
                                    {
                                        question: "necessary actions-q8",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                    {
                                        question: "benefits-q9",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no benefits",
                                                display:
                                                    "There are no benefits",
                                            },
                                        },
                                    },
                                    {
                                        question: "communication-q10",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "contact",
                                                display:
                                                    "Dr. Dexter Hadley or the UCF IRB",
                                            },
                                        },
                                    },
                                    {
                                        question: "removeFromStudy-q11",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "withdraw",
                                                display:
                                                    "By deleting your account through your personalized dashboard in the web application portal",
                                            },
                                        },
                                    },
                                    {
                                        question: "dataUse-q12",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "true",
                                                display: "True",
                                            },
                                        },
                                    },
                                ],
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "not be paid",
                                                display:
                                                    "I will not be paid to take part in this study and I am responsible for any cell phone charges or cost to release my medical records.",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "paid",
                                                display:
                                                    "I will be paid or reimbursed for my participation in this study.",
                                            },
                                        },
                                    },
                                ],
                            },
                            {
                                linkId: "consentToResearch-q14",
                                text: "Do you give your consent to participate in this research study?",
                                type: "choice",
                                required: true,
                                enableWhen: [
                                    {
                                        question: "necessary actions-q8",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "share",
                                                display:
                                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                                            },
                                        },
                                    },
                                    {
                                        question: "benefits-q9",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "no benefits",
                                                display:
                                                    "There are no benefits",
                                            },
                                        },
                                    },
                                    {
                                        question: "communication-q10",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "contact",
                                                display:
                                                    "Dr. Dexter Hadley or the UCF IRB",
                                            },
                                        },
                                    },
                                    {
                                        question: "removeFromStudy-q11",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "withdraw",
                                                display:
                                                    "By deleting your account through your personalized dashboard in the web application portal",
                                            },
                                        },
                                    },
                                    {
                                        question: "dataUse-q12",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "true",
                                                display: "True",
                                            },
                                        },
                                    },
                                    {
                                        question: "paidStudy-q13",
                                        operator: "=",
                                        answer: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "not be paid",
                                                display:
                                                    "I will not be paid to take part in this study and I am responsible for any cell phone charges or cost to release my medical records.",
                                            },
                                        },
                                    },
                                ],
                                answerOption: [
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "consent",
                                                display:
                                                    "I consent to take part in this research study",
                                            },
                                        },
                                    },
                                    {
                                        value: {
                                            Coding: {
                                                system: "https://www.covidimaging.com/terms-of-participation",
                                                code: "not-consent",
                                                display: "I do not consent",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                text: "Imaging Sites Questionnaire",
                linkId: "imaging-sites-group",
                repeats: true,
                type: "group",
                enableBehavior: "all",
                enableWhen: [
                    {
                        question: "covid-test-q1",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "http://snomed.info/sct",
                                code: "373066001",
                                display: "Yes",
                            },
                        },
                    },
                    {
                        question: "18-years-old-q32",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "http://snomed.info/sct",
                                code: "373066001",
                                display: "Yes",
                            },
                        },
                    },
                    {
                        question: "chest-x-ray-q33",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "http://snomed.info/sct",
                                code: "373066001",
                                display: "Yes",
                            },
                        },
                    },
                    {
                        question: "necessary actions-q8",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "share",
                                display:
                                    "Share your COVID-19 chest x-ray and complete a brief survey",
                            },
                        },
                    },
                    {
                        question: "benefits-q9",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "no benefits",
                                display: "There are no benefits",
                            },
                        },
                    },
                    {
                        question: "communication-q10",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "contact",
                                display: "Dr. Dexter Hadley or the UCF IRB",
                            },
                        },
                    },
                    {
                        question: "removeFromStudy-q11",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "withdraw",
                                display:
                                    "By deleting your account through your personalized dashboard in the web application portal",
                            },
                        },
                    },
                    {
                        question: "dataUse-q12",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "true",
                                display: "True",
                            },
                        },
                    },
                    {
                        question: "paidStudy-q13",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "not be paid",
                                display:
                                    "I will not be paid to take part in this study and I am responsible for any cell phone charges or cost to release my medical records.",
                            },
                        },
                    },
                    {
                        question: "consentToResearch-q14",
                        operator: "=",
                        answer: {
                            Coding: {
                                system: "https://www.covidimaging.com/terms-of-participation",
                                code: "consent",
                                display:
                                    "I consent to take part in this research study",
                            },
                        },
                    },
                ],
                item: [
                    {
                        linkId: "name-of-site",
                        text: "Name of Site",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "street-address-of-site",
                        text: "Street address of Site",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "city",
                        text: "City",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "state",
                        text: "State",
                        type: "string",
                        required: true,
                    },
                    {
                        linkId: "zip-code",
                        text: "ZIP code",
                        type: "integer",
                    },
                    {
                        linkId: "MRN",
                        text: "MRN",
                        type: "string",
                    },
                ],
            },
        ],
    },
    "patient-report-baseline": {
        date: "2022-08-05T13:11:42+00:00",
        meta: {
            profile: ["http://covidimaging.com/questionnaire"]
        },
        publisher: "ICHOM",
        jurisdiction: [
            {
                coding: [
                    {
                        code: "001",
                        system: "http://unstats.un.org/unsd/methods/m49/m49.htm",
                        display: "World",
                    },
                ],
            },
        ],
        name: "PatientReportedBaseline",
        item: [
            {
                item: [
                    {
                        text: "What is the patient's medical record number?",
                        type: "integer",
                        linkId: "N/A-Clinical",
                        required: true,
                    },
                    {
                        text: "What is the patient's last name?",
                        type: "string",
                        linkId: "LastName-Clinical",
                        required: true,
                    },
                ],
                text: "General information",
                type: "group",
                linkId: "General-Information-Clinical",
                required: true,
            },
            {
                item: [
                    {
                        text: "Please indicate your sex at birth.",
                        type: "choice",
                        linkId: "Sex",
                        required: true,
                        answerValueSet:
                            "http://hl7.org/fhir/ValueSet/administrative-gender",
                    },
                    {
                        text: "What is your country of residence?",
                        type: "choice",
                        linkId: "COUNTRY",
                        required: true,
                        answerValueSet:
                            "http://hl7.org/fhir/ValueSet/iso3166-1-2",
                    },
                    {
                        text: "Please indicate the ethnicity that you identify with.",
                        type: "string",
                        linkId: "Ethnicity",
                        required: true,
                        answerValueSet:
                            "https://connect.ichom.org/fhir/ValueSet/DemographicFactorsEthnicity",
                    },
                    {
                        text: "Please indicate the biological race that you identify with.",
                        type: "string",
                        linkId: "Race",
                        required: true,
                        answerValueSet:
                            "https://connect.ichom.org/fhir/ValueSet/DemographicFactorsRace",
                    },
                    {
                        text: "Please indicate your highest level of schooling.",
                        type: "choice",
                        linkId: "EducationLevel",
                        required: true,
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        code: "0",
                                        system: "urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96",
                                        display: "None",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "1",
                                        system: "urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96",
                                        display: "Primary",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "2",
                                        system: "urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96",
                                        display: "Secondary",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "3",
                                        system: "urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96",
                                        display: "Tertiary",
                                    },
                                },
                            },
                        ],
                    },
                    {
                        text: "Please indicate your current relationship status.",
                        type: "choice",
                        linkId: "RelationshipStatus",
                        required: true,
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        code: "0",
                                        system: "urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3",
                                        display: "Not married/partnered",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "1",
                                        system: "urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3",
                                        display: "Married/partnered",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "2",
                                        system: "urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3",
                                        display: "Divorced/separated",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "3",
                                        system: "urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3",
                                        display: "Widowed",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "4",
                                        system: "urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3",
                                        display: "unknown",
                                    },
                                },
                            },
                        ],
                    },
                    {
                        text: "Please indicate your current menopausal status:",
                        type: "choice",
                        linkId: "MENOPAUSE",
                        required: true,
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "female",
                                        system: "http://hl7.org/fhir/administrative-gender",
                                    },
                                },
                                operator: "=",
                                question: "Sex",
                            },
                        ],
                        answerOption: [
                            {
                                value: {
                                    Coding: {
                                        code: "0",
                                        system: "urn:uuid:cc3b3106-bc4b-4b9b-bf15-249ae1c3443f",
                                        display: "Pre-menopause",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "1",
                                        system: "urn:uuid:cc3b3106-bc4b-4b9b-bf15-249ae1c3443f",
                                        display:
                                            "Post-menopausei (natural/surgical): if you have not had your period >12 months, caused by natural decline of hormones or due to surgery",
                                    },
                                },
                            },
                            {
                                value: {
                                    Coding: {
                                        code: "3",
                                        system: "urn:uuid:cc3b3106-bc4b-4b9b-bf15-249ae1c3443f",
                                        display:
                                            "I don't know what my current menopausal status is",
                                    },
                                },
                            },
                        ],
                    },
                ],
                text: "Demographic factors",
                type: "group",
                linkId: "Demographics",
                required: true,
            },
            {
                item: [
                    {
                        text: "Have you been told by a doctor that you have any of the following?",
                        type: "choice",
                        linkId: "ComorbiditiesSACQ",
                        repeats: true,
                        required: true,
                        answerValueSet:
                            "https://connect.ichom.org/fhir/ValueSet/SACQPatientComorbidityHistory",
                    },
                    {
                        text: "Do you receive treatment for heart disease (For example, angina, heart failure, or heart attack)?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_HeartDiseaseFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "1",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your heart disease limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_HeartDiseaseFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "1",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for high blood pressure?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_HighBloodPressureFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "2",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your high blood pressure limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_HighBloodPressureFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "2",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for lung disease?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_LungDiseaseFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "3",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your lung disease limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_LungDiseaseFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "3",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for diabetes?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_DiabetesFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "4",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your diabetes limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_DiabetesFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "4",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for an ulcer or stomach disease?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_StomachDiseaseFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "5",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your ulcer or stomach disease limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_StomachDiseaseFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "5",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for kidney disease?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_KidneyDiseaseFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "6",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your kidney disease limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_KidneyDiseaseFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "6",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for liver disease?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_LiverDiseaseFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "7",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your liver disease limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_LiverDiseaseFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "7",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for anemia or other blood disease?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_BloodDiseaseFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "8",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your anemia or other blood disease limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_BloodDiseaseFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "8",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for cancer/another cancer?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_CancerFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "9",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your cancer/other cancer limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_CancerFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "9",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for depression?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_DepressionFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "10",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your depression limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_DepressionFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "10",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for osteoarthritis/degenerative arthritis?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_OsteoarthritisFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "11",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your osteoarthritis/degenerative arthritis limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_OsteoarthritisFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "11",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for back pain?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_BackPainFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "12",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your back pain limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_BackPainFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "12",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Do you receive treatment for rheumatoid arthritis?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_RheumatoidArthritisFU1",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "13",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "Does your rheumatoid arthritis limit your activities?",
                        type: "boolean",
                        linkId: "ComorbiditiesSACQ_RheumatoidArthritisFU2",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "13",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                    {
                        text: "What other medical problems are you experiencing?",
                        type: "text",
                        linkId: "ComorbiditiesSACQ_Other",
                        enableWhen: [
                            {
                                answer: {
                                    Coding: {
                                        code: "14",
                                        system: "http://connect.ichom.org/fhir/CodeSystem/sacq-patient-comorbidity-history",
                                    },
                                },
                                operator: "=",
                                question: "ComorbiditiesSACQ",
                            },
                        ],
                    },
                ],
                text: "Clinical factors",
                type: "group",
                linkId: "Baseline-Clinical-Factors",
                required: true,
            },
            {
                item: [
                    {
                        item: [
                            {
                                text: "Do you have any trouble doing strenuous activities, like carrying a heavy shopping bag or a suitcase?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q01",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Do you have any trouble taking a long walk?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q02",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Do you have any trouble taking a short walk outside of the house?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q03",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Do you need to stay in bed or a chair during the day?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q04",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Do you need help with eating, dressing, washing yourself or using the toilet?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q05",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                        ],
                        text: "We are interested in some things about you and your health. Please answer all of the questions yourself by selecting the answer that best applies to you. There are no 'right' or 'wrong' answers. The information that you provide will remain strictly confidential.",
                        type: "group",
                        linkId: "EORTC-QLQ-Q01-Q05",
                    },
                    {
                        item: [
                            {
                                text: "Were you limited in doing either your work or other daily activities?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q06",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Were you limited in pursuing your hobbies or other leisure time activities?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q07",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Were you short of breath?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q08",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had pain?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q09",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you need to rest?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q10",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had trouble sleeping?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q11",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you felt weak?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q12",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you lacked appetite?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q13",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you felt nauseated?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q14",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you vomited?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q15",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you been constipated?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q16",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had diarrhea?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q17",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Were you tired?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q18",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did pain interfere with your daily activities?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q19",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had difficulty in concentrating on things, like reading a newspaper or watching television?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q20",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you feel tense?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q21",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you worry?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q22",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you feel irritable?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q23",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you feel depressed?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q24",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had difficulty remembering things?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q25",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Has your physical condition or medical treatment interfered with your family life?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q26",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Has your physical condition or medical treatment interfered with your social activities?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q27",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Has your physical condition or medical treatment caused you financial difficulties?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q28",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                        ],
                        text: "During the past week:",
                        type: "group",
                        linkId: "EORTC-QLQ-Q06-Q28",
                    },
                    {
                        item: [
                            {
                                text: "How would you rate your overall health during the past week?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q29",
                                required: true,
                                answerOption: [
                                    {
                                        value: {
                                            integer: 1,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 2,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 3,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 4,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 5,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 6,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 7,
                                        },
                                    },
                                ],
                            },
                            {
                                text: "How would you rate your overall quality of life during the past week?",
                                type: "choice",
                                linkId: "EORTCQLQC30_Q30",
                                required: true,
                                answerOption: [
                                    {
                                        value: {
                                            integer: 1,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 2,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 3,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 4,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 5,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 6,
                                        },
                                    },
                                    {
                                        value: {
                                            integer: 7,
                                        },
                                    },
                                ],
                            },
                        ],
                        text: "For the following questions please select the number between 1 and 7 that best applies to you, with 1 = Very poor and 7 = Excellent.",
                        type: "group",
                        linkId: "EORTC-QLQ-Q29-Q30",
                    },
                    {
                        item: [
                            {
                                text: "Did you have a dry mouth?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q31",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did food and drink taste different than usual?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q32",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Were your eyes painful, irritated or watery?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q33",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you lost any hair?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q34",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Were you upset by the loss of your hair?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q35",
                                enableWhen: [
                                    {
                                        answer: {
                                            boolean: true,
                                        },
                                        operator: "=",
                                        question: "EORTCQLQBR23_Q34",
                                    },
                                ],
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you feel ill or unwell?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q36",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you have hot flushes?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q37",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you have headaches?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q38",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you felt physically less attractive as a result of your disease or treatment?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q39",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you been feeling less feminine as a result of your disease or treatment?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q40",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Did you find it difficult to look at yourself naked?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q41",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you been dissatisfied with your body?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q42",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Were you worried about your health in the future?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q43",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                        ],
                        text: "Patients sometimes report that they have the following symptoms or problems. Please indicate the extent to which you have experienced these symptoms or problems during the past week. \n  Please answer by selecting the answer that best applies to you. During the past week:",
                        type: "group",
                        linkId: "EORTC-QLQ-Q31-Q43",
                    },
                    {
                        item: [
                            {
                                text: "To what extent were you interested in sex?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q44",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "To what extent were you sexually active? (with or without intercourse)",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q45",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "To what extent was sex enjoyable for you?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q46",
                                enableWhen: [
                                    {
                                        answer: {
                                            boolean: true,
                                        },
                                        operator: "=",
                                        question: "EORTCQLQBR23_Q45",
                                    },
                                ],
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                        ],
                        text: "During the past four weeks:",
                        type: "group",
                        linkId: "EORTC-QLQ-Q44-Q46",
                    },
                    {
                        item: [
                            {
                                text: "Did you have a swollen arm or hand?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q48",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Was it difficult to raise your arm or to move it sideways?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q49",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had any pain in the area of your affected breast?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q50",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Was the area of your affected breast swollen?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q51",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Was the area of your affected breast oversensitive?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q52",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had skin problems on or in the area of your affected breast (e.g., itchy, dry, flaky)?",
                                type: "choice",
                                linkId: "EORTCQLQBR23_Q53",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                            {
                                text: "Have you had tingling hands or feet?",
                                type: "choice",
                                linkId: "EORTC QLQ-LMC21",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/EORTCQLQValueSet",
                            },
                        ],
                        text: "During the past week:",
                        type: "group",
                        linkId: "EORTC-QLQ-Q47-Q53",
                    },
                ],
                text: "Degree of Health - EORTC-QLQ",
                type: "group",
                linkId: "Degree-of-Health-EORTC-QLQ",
            },
            {
                item: [
                    {
                        item: [
                            {
                                text: "How you look in the mirror clothed?",
                                type: "choice",
                                linkId: "BREASTQMAST_Q01",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/BreastQValueSet",
                            },
                            {
                                text: "How comfortable your bras fit?",
                                type: "choice",
                                linkId: "BREASTQMAST_Q02",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/BreastQValueSet",
                            },
                            {
                                text: "Being able to wear clothing that is more fitted?",
                                type: "choice",
                                linkId: "BREASTQMAST_Q03",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/BreastQValueSet",
                            },
                            {
                                text: "How you look in the mirror unclothed?",
                                type: "choice",
                                linkId: "BREASTQMAST_Q04",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/BreastQValueSet",
                            },
                        ],
                        text: "With your breasts in mind, or if you have had a mastectomy, with your breast area in mind, in the past 2 weeks, \n      how satisfied or dissatisfied have you been with:",
                        type: "group",
                        linkId: "IntroBreastQ",
                    },
                ],
                text: "Degree of Health - BreastQ:",
                type: "group",
                linkId: "Degree-of-Health-BreastQ",
            },
            {
                item: [
                    {
                        item: [
                            {
                                text: "I have pain in my joints",
                                type: "choice",
                                linkId: "FACTES_BRM1",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/FACTESValueSet",
                            },
                            {
                                text: "I have vaginal discharge",
                                type: "choice",
                                linkId: "FACTES_ES4",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/FACTESValueSet",
                            },
                            {
                                text: "I have vaginal itching/irritation",
                                type: "choice",
                                linkId: "FACTES_ES5",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/FACTESValueSet",
                            },
                            {
                                text: "I have vaginal bleeding or spotting",
                                type: "choice",
                                linkId: "FACTES_ES6",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/FACTESValueSet",
                            },
                            {
                                text: "I have vaginal dryness",
                                type: "choice",
                                linkId: "FACTES_ES7",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/FACTESValueSet",
                            },
                            {
                                text: "I have pain or discomfort with intercourse",
                                type: "choice",
                                linkId: "FACTES_ES8",
                                required: true,
                                answerValueSet:
                                    "https://connect.ichom.org/fhir/ValueSet/FACTESValueSet",
                            },
                        ],
                        text: "Please indicate your response as it applies to the past 7 days:",
                        type: "group",
                        linkId: "IntroFactes",
                    },
                ],
                text: "Degree of Health - FACTES",
                type: "group",
                linkId: "Degree-of-Health-FACTES",
            },
        ],
        experimental: true,
        resourceType: "Questionnaire",
        title: "Patient reported response at baseline",
        status: "draft",
        id: "PatientReportedBaseline",
        url: "https://connect.ichom.org/fhir/Questionnaire/PatientReportedBaseline",
        version: "0.0.1",
        contact: [
            {
                name: "ICHOM",
                telecom: [
                    {
                        value: "https://ichom.org",
                        system: "url",
                    },
                ],
            },
        ],
        text: {
            div: '<div xmlns="http://www.w3.org/1999/xhtml"><b>Structure</b><table border="1" cellpadding="0" cellspacing="0" style="border: 1px #F0F0F0 solid; font-size: 11px; font-family: verdana; vertical-align: top;"><tr style="border: 2px #F0F0F0 solid; font-size: 11px; font-family: verdana; vertical-align: top"><th style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/formats.html#table" title="The linkId for the item">LinkId</a></th><th style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/formats.html#table" title="Text for the item">Text</a></th><th style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/formats.html#table" title="Minimum and Maximum # of times the the itemcan appear in the instance">Cardinality</a></th><th style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/formats.html#table" title="The type of the item">Type</a></th><th style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/formats.html#table" title="Additional information about the item">Description &amp; Constraints</a><span style="float: right"><a href="http://hl7.org/fhir/R4/formats.html#table" title="Legend for this format"><img src="http://hl7.org/fhir/R4/help16.png" alt="doco" style="background-color: inherit"/></a></span></th></tr><tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1.png)" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon_q_root.gif" alt="." style="background-color: white; background-color: inherit" title="QuestionnaireRoot" class="hierarchy"/> PatientReportedBaseline</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Questionnaire</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">https://connect.ichom.org/fhir/Questionnaire/PatientReportedBaseline#0.0.1</td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck11.png)" id="item.General-Information-Clinical" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> General-Information-Clinical</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">General information</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.N/A-Clinical" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-integer.png" alt="." style="background-color: white; background-color: inherit" title="Integer" class="hierarchy"/> N/A-Clinical</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">What is the patient\'s medical record number?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-integer">integer</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck100.png)" id="item.LastName-Clinical" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-string.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="String" class="hierarchy"/> LastName-Clinical</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">What is the patient\'s last name?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-string">string</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck11.png)" id="item.Demographics" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> Demographics</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Demographic factors</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.Sex" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> Sex</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate your sex at birth.</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-01-Baseline.html">The patient\'s sex at birth</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.COUNTRY" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> COUNTRY</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">What is your country of residence?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-01-Baseline.html">Country of residence of patient</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.Ethnicity" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-string.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="String" class="hierarchy"/> Ethnicity</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate the ethnicity that you identify with.</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-string">string</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-01-Baseline.html">Ethnicity of patient</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.Race" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-string.png" alt="." style="background-color: white; background-color: inherit" title="String" class="hierarchy"/> Race</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate the biological race that you identify with.</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-string">string</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-01-Baseline.html">Race of patient</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.EducationLevel" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EducationLevel</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate your highest level of schooling.</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Options: <a href="#opt-item.EducationLevel">4 options</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.RelationshipStatus" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> RelationshipStatus</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate your current relationship status.</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Options: <a href="#opt-item.RelationshipStatus">5 options</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck100.png)" id="item.MENOPAUSE" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> MENOPAUSE</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate your current menopausal status:</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.Sex">Sex</a> = Female (AdministrativeGender#female)</span><br/>Options: <a href="#opt-item.MENOPAUSE">3 options</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck11.png)" id="item.Baseline-Clinical-Factors" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> Baseline-Clinical-Factors</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Clinical factors</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> ComorbiditiesSACQ</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you been told by a doctor that you have any of the following?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..*</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-01-Baseline.html">SACQ Patient\'s comorbidity history</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_HeartDiseaseFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_HeartDiseaseFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for heart disease (For example, angina, heart failure, or heart attack)?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Heart disease (For example, angina, heart attack, or heart failure) (SACQ patient\'s comorbidity history#1)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_HeartDiseaseFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_HeartDiseaseFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your heart disease limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Heart disease (For example, angina, heart attack, or heart failure) (SACQ patient\'s comorbidity history#1)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_HighBloodPressureFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_HighBloodPressureFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for high blood pressure?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = High blood pressure (SACQ patient\'s comorbidity history#2)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_HighBloodPressureFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_HighBloodPressureFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your high blood pressure limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = High blood pressure (SACQ patient\'s comorbidity history#2)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_LungDiseaseFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_LungDiseaseFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for lung disease?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Lung disease (For example,  asthma, chronic bronchitis, or emphysema) (SACQ patient\'s comorbidity history#3)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_LungDiseaseFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_LungDiseaseFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your lung disease limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Lung disease (For example,  asthma, chronic bronchitis, or emphysema) (SACQ patient\'s comorbidity history#3)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_DiabetesFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_DiabetesFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for diabetes?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Diabetes (SACQ patient\'s comorbidity history#4)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_DiabetesFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_DiabetesFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your diabetes limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Diabetes (SACQ patient\'s comorbidity history#4)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_StomachDiseaseFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_StomachDiseaseFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for an ulcer or stomach disease?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Ulcer or stomach disease (SACQ patient\'s comorbidity history#5)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_StomachDiseaseFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_StomachDiseaseFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your ulcer or stomach disease limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Ulcer or stomach disease (SACQ patient\'s comorbidity history#5)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_KidneyDiseaseFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_KidneyDiseaseFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for kidney disease?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Kidney disease (SACQ patient\'s comorbidity history#6)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_KidneyDiseaseFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_KidneyDiseaseFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your kidney disease limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Kidney disease (SACQ patient\'s comorbidity history#6)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_LiverDiseaseFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_LiverDiseaseFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for liver disease?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Liver disease (SACQ patient\'s comorbidity history#7)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_LiverDiseaseFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_LiverDiseaseFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your liver disease limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Liver disease (SACQ patient\'s comorbidity history#7)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_BloodDiseaseFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_BloodDiseaseFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for anemia or other blood disease?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Anemia or other blood disease (SACQ patient\'s comorbidity history#8)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_BloodDiseaseFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_BloodDiseaseFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your anemia or other blood disease limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Anemia or other blood disease (SACQ patient\'s comorbidity history#8)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_CancerFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_CancerFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for cancer/another cancer?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Cancer/Other cancer (within the last 5 years) (SACQ patient\'s comorbidity history#9)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_CancerFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_CancerFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your cancer/other cancer limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Cancer/Other cancer (within the last 5 years) (SACQ patient\'s comorbidity history#9)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_DepressionFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_DepressionFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for depression?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Depression (SACQ patient\'s comorbidity history#10)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_DepressionFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_DepressionFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your depression limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Depression (SACQ patient\'s comorbidity history#10)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_OsteoarthritisFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_OsteoarthritisFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for osteoarthritis/degenerative arthritis?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Osteoarthritis, degenerative arthritis (SACQ patient\'s comorbidity history#11)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_OsteoarthritisFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_OsteoarthritisFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your osteoarthritis/degenerative arthritis limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Osteoarthritis, degenerative arthritis (SACQ patient\'s comorbidity history#11)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_BackPainFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_BackPainFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for back pain?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Back pain (SACQ patient\'s comorbidity history#12)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_BackPainFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_BackPainFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your back pain limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Back pain (SACQ patient\'s comorbidity history#12)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_RheumatoidArthritisFU1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: white; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_RheumatoidArthritisFU1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you receive treatment for rheumatoid arthritis?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Rheumatoid arthritis (SACQ patient\'s comorbidity history#13)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck110.png)" id="item.ComorbiditiesSACQ_RheumatoidArthritisFU2" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-boolean.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Boolean" class="hierarchy"/> ComorbiditiesSACQ_RheumatoidArthritisFU2</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Does your rheumatoid arthritis limit your activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-boolean">boolean</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Rheumatoid arthritis (SACQ patient\'s comorbidity history#13)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck100.png)" id="item.ComorbiditiesSACQ_Other" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-text.png" alt="." style="background-color: white; background-color: inherit" title="Text" class="hierarchy"/> ComorbiditiesSACQ_Other</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">What other medical problems are you experiencing?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-text">text</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.ComorbiditiesSACQ">ComorbiditiesSACQ</a> = Other medical problems (SACQ patient\'s comorbidity history#14)</span></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck11.png)" id="item.Degree-of-Health-EORTC-QLQ" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> Degree-of-Health-EORTC-QLQ</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Degree of Health - EORTC-QLQ</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck111.png)" id="item.EORTC-QLQ-Q01-Q05" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> EORTC-QLQ-Q01-Q05</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">We are interested in some things about you and your health. Please answer all of the questions yourself by selecting the answer that best applies to you. There are no \'right\' or \'wrong\' answers. The information that you provide will remain strictly confidential.</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q01" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q01</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you have any trouble doing strenuous activities, like carrying a heavy shopping bag or a suitcase?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q02" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q02</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you have any trouble taking a long walk?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q03" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q03</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you have any trouble taking a short walk outside of the house?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q04" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q04</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you need to stay in bed or a chair during the day?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1100.png)" id="item.EORTCQLQC30_Q05" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q05</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Do you need help with eating, dressing, washing yourself or using the toilet?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck111.png)" id="item.EORTC-QLQ-Q06-Q28" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> EORTC-QLQ-Q06-Q28</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">During the past week:</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q06" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q06</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were you limited in doing either your work or other daily activities?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q07" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q07</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were you limited in pursuing your hobbies or other leisure time activities?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q08" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q08</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were you short of breath?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q09" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q09</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had pain?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q10" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q10</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you need to rest?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q11" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q11</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had trouble sleeping?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q12" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q12</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you felt weak?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q13" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q13</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you lacked appetite?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q14" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q14</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you felt nauseated?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q15" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q15</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you vomited?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q16" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q16</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you been constipated?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q17" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q17</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had diarrhea?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q18" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q18</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were you tired?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q19" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q19</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did pain interfere with your daily activities?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q20" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q20</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had difficulty in concentrating on things, like reading a newspaper or watching television?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q21" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q21</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you feel tense?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q22" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q22</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you worry?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q23" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q23</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you feel irritable?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q24" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q24</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you feel depressed?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q25" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q25</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had difficulty remembering things?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q26" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q26</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Has your physical condition or medical treatment interfered with your family life?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q27" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q27</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Has your physical condition or medical treatment interfered with your social activities?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1100.png)" id="item.EORTCQLQC30_Q28" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q28</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Has your physical condition or medical treatment caused you financial difficulties?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck111.png)" id="item.EORTC-QLQ-Q29-Q30" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> EORTC-QLQ-Q29-Q30</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">For the following questions please select the number between 1 and 7 that best applies to you, with 1 = Very poor and 7 = Excellent.</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQC30_Q29" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q29</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">How would you rate your overall health during the past week?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Options: <a href="#opt-item.EORTCQLQC30_Q29">7 options</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1100.png)" id="item.EORTCQLQC30_Q30" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQC30_Q30</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">How would you rate your overall quality of life during the past week?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Options: <a href="#opt-item.EORTCQLQC30_Q30">7 options</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck111.png)" id="item.EORTC-QLQ-Q31-Q43" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> EORTC-QLQ-Q31-Q43</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Patients sometimes report that they have the following symptoms or problems. Please indicate the extent to which you have experienced these symptoms or problems during the past week. \n  Please answer by selecting the answer that best applies to you. During the past week:</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q31" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q31</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you have a dry mouth?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q32" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q32</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did food and drink taste different than usual?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q33" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q33</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were your eyes painful, irritated or watery?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q34" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q34</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you lost any hair?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q35" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q35</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were you upset by the loss of your hair?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.EORTCQLQBR23_Q34">EORTCQLQBR23_Q34</a> = true</span><br/>Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q36" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q36</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you feel ill or unwell?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q37" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q37</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you have hot flushes?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q38" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q38</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you have headaches?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q39" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q39</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you felt physically less attractive as a result of your disease or treatment?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q40" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q40</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you been feeling less feminine as a result of your disease or treatment?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q41" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q41</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you find it difficult to look at yourself naked?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q42" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q42</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you been dissatisfied with your body?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1100.png)" id="item.EORTCQLQBR23_Q43" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q43</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Were you worried about your health in the future?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck111.png)" id="item.EORTC-QLQ-Q44-Q46" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> EORTC-QLQ-Q44-Q46</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">During the past four weeks:</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q44" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q44</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">To what extent were you interested in sex?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1110.png)" id="item.EORTCQLQBR23_Q45" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q45</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">To what extent were you sexually active? (with or without intercourse)</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1100.png)" id="item.EORTCQLQBR23_Q46" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q46</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">To what extent was sex enjoyable for you?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Enable When: <span><a href="#item.EORTCQLQBR23_Q45">EORTCQLQBR23_Q45</a> = true</span><br/>Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck101.png)" id="item.EORTC-QLQ-Q47-Q53" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> EORTC-QLQ-Q47-Q53</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">During the past week:</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.EORTCQLQBR23_Q48" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q48</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Did you have a swollen arm or hand?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.EORTCQLQBR23_Q49" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q49</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Was it difficult to raise your arm or to move it sideways?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.EORTCQLQBR23_Q50" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q50</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had any pain in the area of your affected breast?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.EORTCQLQBR23_Q51" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q51</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Was the area of your affected breast swollen?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.EORTCQLQBR23_Q52" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q52</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Was the area of your affected breast oversensitive?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.EORTCQLQBR23_Q53" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> EORTCQLQBR23_Q53</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had skin problems on or in the area of your affected breast (e.g., itchy, dry, flaky)?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1000.png)" id="item.EORTC QLQ-LMC21" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> EORTC QLQ-LMC21</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Have you had tingling hands or feet?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">EORTC-QLQ questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck11.png)" id="item.Degree-of-Health-BreastQ" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> Degree-of-Health-BreastQ</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Degree of Health - BreastQ:</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck101.png)" id="item.IntroBreastQ" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> IntroBreastQ</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">With your breasts in mind, or if you have had a mastectomy, with your breast area in mind, in the past 2 weeks, \n      how satisfied or dissatisfied have you been with:</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.BREASTQMAST_Q01" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> BREASTQMAST_Q01</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">How you look in the mirror clothed?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-03-Year1and2.html">BreastQ response</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.BREASTQMAST_Q02" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> BREASTQMAST_Q02</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">How comfortable your bras fit?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-03-Year1and2.html">BreastQ response</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1010.png)" id="item.BREASTQMAST_Q03" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> BREASTQMAST_Q03</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Being able to wear clothing that is more fitted?</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-03-Year1and2.html">BreastQ response</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck1000.png)" id="item.BREASTQMAST_Q04" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vline.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> BREASTQMAST_Q04</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">How you look in the mirror unclothed?</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-03-Year1and2.html">BreastQ response</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck01.png)" id="item.Degree-of-Health-FACTES" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Group" class="hierarchy"/> Degree-of-Health-FACTES</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Degree of Health - FACTES</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck001.png)" id="item.IntroFactes" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-group.png" alt="." style="background-color: white; background-color: inherit" title="Group" class="hierarchy"/> IntroFactes</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Please indicate your response as it applies to the past 7 days:</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">0..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-group">group</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"/></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck0010.png)" id="item.FACTES_BRM1" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> FACTES_BRM1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">I have pain in my joints</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">FACT-ES questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck0010.png)" id="item.FACTES_ES4" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> FACTES_ES4</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">I have vaginal discharge</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">FACT-ES questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck0010.png)" id="item.FACTES_ES5" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> FACTES_ES5</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">I have vaginal itching/irritation</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">FACT-ES questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck0010.png)" id="item.FACTES_ES6" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> FACTES_ES6</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">I have vaginal bleeding or spotting</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">FACT-ES questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: #F7F7F7"><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck0010.png)" id="item.FACTES_ES7" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: #F7F7F7; background-color: inherit" title="Coding" class="hierarchy"/> FACTES_ES7</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">I have vaginal dryness</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: #F7F7F7; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">FACT-ES questionnaire</a></td></tr>\r\n<tr style="border: 1px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white"><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(tbl_bck0000.png)" id="item.FACTES_ES8" class="hierarchy"><img src="tbl_spacer.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_blank.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="tbl_vjoin_end.png" alt="." style="background-color: inherit" class="hierarchy"/><img src="icon-q-coding.png" alt="." style="background-color: white; background-color: inherit" title="Coding" class="hierarchy"/> FACTES_ES8</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">I have pain or discomfort with intercourse</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">1..1</td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy"><a href="http://hl7.org/fhir/R4/codesystem-item-type.html#item-type-choice">choice</a></td><td style="vertical-align: top; text-align : left; background-color: white; border: 1px #F0F0F0 solid; padding:0px 4px 0px 4px" class="hierarchy">Value Set: <a href="Bundle-DebugBundlePatient-04-Year3and4.html">FACT-ES questionnaire</a></td></tr>\r\n<tr><td colspan="5" class="hierarchy"><br/><a href="http://hl7.org/fhir/R4/formats.html#table" title="Legend for this format"><img src="http://hl7.org/fhir/R4/help16.png" alt="doco" style="background-color: inherit"/> Documentation for this format</a></td></tr></table><hr/><p><b>Option Sets</b></p><a name="opt-item.EducationLevel"> </a><p><b>Answer options for EducationLevel</b></p><ul><li style="font-size: 11px">urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96#0 (&quot;None&quot;)</li><li style="font-size: 11px">urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96#1 (&quot;Primary&quot;)</li><li style="font-size: 11px">urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96#2 (&quot;Secondary&quot;)</li><li style="font-size: 11px">urn:uuid:47dcf78e-3c63-4a6b-8ac7-f4f669be2b96#3 (&quot;Tertiary&quot;)</li></ul><a name="opt-item.RelationshipStatus"> </a><p><b>Answer options for RelationshipStatus</b></p><ul><li style="font-size: 11px">urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3#0 (&quot;Not married/partnered&quot;)</li><li style="font-size: 11px">urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3#1 (&quot;Married/partnered&quot;)</li><li style="font-size: 11px">urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3#2 (&quot;Divorced/separated&quot;)</li><li style="font-size: 11px">urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3#3 (&quot;Widowed&quot;)</li><li style="font-size: 11px">urn:uuid:98b0862c-ffe9-46a3-ad47-f4e2ede907c3#4 (&quot;unknown&quot;)</li></ul><a name="opt-item.MENOPAUSE"> </a><p><b>Answer options for MENOPAUSE</b></p><ul><li style="font-size: 11px">urn:uuid:cc3b3106-bc4b-4b9b-bf15-249ae1c3443f#0 (&quot;Pre-menopause&quot;)</li><li style="font-size: 11px">urn:uuid:cc3b3106-bc4b-4b9b-bf15-249ae1c3443f#1 (&quot;Post-menopausei (natural/surgical): if you have not had your period &gt;12 months, caused by natural decline of hormones or due to surgery&quot;)</li><li style="font-size: 11px">urn:uuid:cc3b3106-bc4b-4b9b-bf15-249ae1c3443f#3 (&quot;I don\'t know what my current menopausal status is&quot;)</li></ul><a name="opt-item.EORTCQLQC30_Q29"> </a><p><b>Answer options for EORTCQLQC30_Q29</b></p><ul><li style="font-size: 11px">1</li><li style="font-size: 11px">2</li><li style="font-size: 11px">3</li><li style="font-size: 11px">4</li><li style="font-size: 11px">5</li><li style="font-size: 11px">6</li><li style="font-size: 11px">7</li></ul><a name="opt-item.EORTCQLQC30_Q30"> </a><p><b>Answer options for EORTCQLQC30_Q30</b></p><ul><li style="font-size: 11px">1</li><li style="font-size: 11px">2</li><li style="font-size: 11px">3</li><li style="font-size: 11px">4</li><li style="font-size: 11px">5</li><li style="font-size: 11px">6</li><li style="font-size: 11px">7</li></ul></div>',
            status: "generated",
        },
    },
};
