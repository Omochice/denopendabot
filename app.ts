import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { Hono } from "https://deno.land/x/hono@v3.3.0/mod.ts";
import { deployment, location } from "./app/deployments.ts";
import { handler } from "./app/webhooks.ts";

const app = new Hono();

// copy and transfer all requests to the staging deployment
app.use("*", async (context, next) => {
  const deploy = await deployment();
  console.debug(`🏠 deployment: ${deploy}`);

  if (deploy === "production") {
    const staging = await location("staging");
    if (staging) {
      await fetch(staging + "/api/github/webhooks", context.req.raw.clone());
      console.debug(`✈️ transfered the request to ${staging}`);
    }
  }
  await next();
});

app.get("/", (context) => context.text("Hello, I'm Denopendabot!"));

// handle webhooks with octokit
app.post("/api/github/webhooks", async (context) => {
  await handler(context.req);
  return context.json(null, 200);
});

await serve(app.fetch, { onListen: () => {} });
