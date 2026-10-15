import { connect } from "@vercel/connect/eve";
import { defineOpenAPIConnection } from "eve/connections";

// Lets the agent report its own errors as GitHub issues on this project's repo.
//
// Deliberately tiny: a hand-written spec with two operations instead of GitHub's full REST API,
// and the owner, repo, label, and state are filled in by code, so the model can only list and
// open "agent-error" issues on this one repository.

const [defaultOwner, defaultRepo] = (process.env.GITHUB_ISSUES_REPO ?? "amyegan/PRM").split("/");
// On Vercel, use the repo the deployment was built from.
const owner = process.env.VERCEL_GIT_REPO_OWNER || defaultOwner;
const repo = process.env.VERCEL_GIT_REPO_SLUG || defaultRepo;

export const ERROR_LABEL = "agent-error";

const repoParameters = [
  { name: "owner", in: "path", required: true, schema: { type: "string" } },
  { name: "repo", in: "path", required: true, schema: { type: "string" } },
];

export default defineOpenAPIConnection({
  description: "File and look up error reports (GitHub issues) on this agent's own repository.",
  spec: {
    openapi: "3.0.3",
    info: { title: "GitHub issues (agent error reports)", version: "1.0.0" },
    servers: [{ url: "https://api.github.com" }],
    paths: {
      "/repos/{owner}/{repo}/issues": {
        get: {
          operationId: "list_error_reports",
          summary: "List open error reports, newest first, to check for duplicates before filing.",
          parameters: [
            ...repoParameters,
            { name: "labels", in: "query", schema: { type: "string" } },
            { name: "state", in: "query", schema: { type: "string" } },
            { name: "per_page", in: "query", schema: { type: "integer", default: 30, maximum: 100 } },
          ],
          responses: { "200": { description: "Matching issues" } },
        },
        post: {
          operationId: "create_error_report",
          summary: "Open a new error report. The repository is public: never include personal data.",
          parameters: repoParameters,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "body", "labels"],
                  properties: {
                    title: { type: "string", maxLength: 120 },
                    body: { type: "string", maxLength: 4000 },
                    labels: { type: "array", items: { type: "string", enum: [ERROR_LABEL] } },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Issue created" } },
        },
      },
    },
  },
  // App-scoped: errors happen in scheduled runs and emails too, where no signed-in user is
  // present. Requires the Vercel Connect GitHub App to be installed on the repo.
  auth: connect({ connector: process.env.GITHUB_CONNECTOR ?? "github/prm", principalType: "app" }),
  headers: {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "prm-agent",
  },
  operations: { allow: ["list_error_reports", "create_error_report"] },
  toolCall: {
    providedArguments: { owner, repo, labels: ERROR_LABEL, state: "open" },
  },
});
