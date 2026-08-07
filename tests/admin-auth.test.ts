import { strict as assert } from "node:assert";
import test from "node:test";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

test("GET /admin with no Authorization header is rejected", async () => {
  const response = await fetch(`${BASE_URL}/admin`);

  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate") ?? "", /^Basic realm="Admin"$/);
});

test("GET /admin with the wrong password is rejected", async () => {
  const response = await fetch(`${BASE_URL}/admin`, {
    headers: { Authorization: `Basic ${btoa("admin:not-the-password")}` },
  });

  assert.equal(response.status, 401);
});
