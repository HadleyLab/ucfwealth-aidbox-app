import { randomUUID } from "crypto";
import { TSubscription } from "./helpers";

export const Patient: TSubscription<any> = {
    handler: "Patient",
    handlerFn: async (event, { ctx, helpers }) => {
        const { resource: patient, previous } = event;
        console.log('Handling subscription "Patient"');
        console.log({ patient, previous });
        return { status: 500 };
    },
};

export const User: TSubscription<any> = {
    handler: "User",
    handlerFn: async (event, { ctx, helpers }) => {
        const action = event.action;
        if (action === "create") {
            const patientId = String(randomUUID());
            const patient = await ctx.api.createResource<any>("Patient", {
                id: patientId,
            });
            const user = event.resource;
            user["userType"] = "patient";
            user["data"] = { patient };
            await ctx.api.patchResource<any>("User", user.id, user);
        }
        return { status: 500 };
    },
};
