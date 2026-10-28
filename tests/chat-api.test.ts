import { strict as assert } from "node:assert";
import test from "node:test";

// Every request here fails validation, so none of them reaches Claude or counts toward
// the rate limit — safe to run against any environment.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const question = { role: "user", content: "What does Joynto build?" };

function postChat(body: unknown) {
  return fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function assertInvalid(body: unknown) {
  const response = await postChat(body);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid" });
}

test("POST /api/chat rejects a body that isn't JSON", async () => {
  await assertInvalid("{not json");
});

test("POST /api/chat rejects an empty conversation", async () => {
  await assertInvalid({ messages: [] });
});

test("POST /api/chat rejects a conversation that doesn't end with the visitor", async () => {
  await assertInvalid({ messages: [question, { role: "assistant", content: "Web apps." }] });
});

test("POST /api/chat rejects a conversation that doesn't alternate", async () => {
  await assertInvalid({ messages: [{ role: "assistant", content: "Hi!" }, question] });
  await assertInvalid({ messages: [question, question] });
});

test("POST /api/chat rejects a question over 1500 characters", async () => {
  await assertInvalid({ messages: [{ role: "user", content: "a".repeat(1501) }] });
});

test("POST /api/chat rejects more history than the client ever sends", async () => {
  const turns = Array.from({ length: 13 }, (_, i) =>
    i % 2 === 0 ? question : { role: "assistant", content: "Web apps." }
  );
  await assertInvalid({ messages: turns });
});

test("POST /api/chat rejects an unknown locale or a page outside the site", async () => {
  await assertInvalid({ messages: [question], locale: "fr" });
  await assertInvalid({ messages: [question], page: "https://example.com/" });
});
