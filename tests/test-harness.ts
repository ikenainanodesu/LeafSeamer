import assert from "node:assert/strict";

type TestBody = () => void | Promise<void>;

interface TestCase {
  name: string;
  body: TestBody;
}

const tests: TestCase[] = [];

export const test = (name: string, body: TestBody): void => {
  tests.push({ name, body });
};

export const equal = (actual: unknown, expected: unknown): void => {
  assert.equal(actual, expected);
};

export const deepEqual = (actual: unknown, expected: unknown): void => {
  assert.deepEqual(actual, expected);
};

export const ok = (value: unknown): void => {
  assert.ok(value);
};

export const throws = (body: () => unknown): void => {
  assert.throws(body);
};

export const rejects = async (body: () => Promise<unknown>): Promise<void> => {
  await assert.rejects(body);
};

export const runTests = async (): Promise<void> => {
  let failures = 0;

  for (const current of tests) {
    try {
      await current.body();
      process.stdout.write(`PASS ${current.name}\n`);
    } catch (error) {
      failures += 1;
      process.stderr.write(`FAIL ${current.name}\n`);
      process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
    }
  }

  process.stdout.write(`Tests: ${tests.length}, Failures: ${failures}\n`);
  if (failures > 0) {
    process.exitCode = 1;
  }
};
