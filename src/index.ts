import * as dotenv from "dotenv";
import { createApp, createConfig, createCtx, startApp } from "@aidbox/node-server-sdk";
import * as entities from "./entities.js";
import { createHelpers } from "./helpers.js";
import * as operations from "./operations.js";
import * as subscriptions from "./subscriptions.js";

const main = async () => {
    const config = createConfig();
    // Init app
    const ctx = createCtx({
        config,
        manifest: {
            operations,
            subscriptions,
            entities,
            apiVersion: 2,
        },
    });
    const helpers = await createHelpers(ctx);
    const app = createApp({ ctx, helpers: { ...helpers } }, config);
    // Start app
    const port = +(process.env.APP_PORT || process.env.PORT || 3000);
    await startApp(app, port);
};

main();
