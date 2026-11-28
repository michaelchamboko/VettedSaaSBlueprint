import assert from "node:assert/strict";
import test from "node:test";

import { nodeExecutable } from "../src/lib/article-import/node-runtime";

test("Node runtime preserves Node and honors the scoped explicit override", () => {
  assert.equal(nodeExecutable({ env: {}, execPath: "/usr/bin/node", platform: "linux", access: () => {} }), "/usr/bin/node");
  assert.equal(nodeExecutable({ env: { ARTICLE_NODE_EXECUTABLE: "/opt/node/bin/node" }, execPath: "/opt/opencode", platform: "linux", access: () => {} }), "/opt/node/bin/node");
});

test("native OpenCode resolves an executable Node from Windows and Linux PATH", () => {
  assert.equal(nodeExecutable({
    env: { Path: "C:\\tools;C:\\Program Files\\nodejs" },
    execPath: "C:\\tools\\opencode.exe",
    platform: "win32",
    access: (candidate) => { if (candidate !== "C:\\Program Files\\nodejs\\node.exe") throw new Error("missing"); },
  }), "C:\\Program Files\\nodejs\\node.exe");
  assert.equal(nodeExecutable({
    env: { PATH: "/opt/opencode:/usr/local/bin:/usr/bin" },
    execPath: "/opt/opencode/opencode",
    platform: "linux",
    access: (candidate) => { if (candidate !== "/usr/local/bin/node") throw new Error("missing"); },
  }), "/usr/local/bin/node");
});

test("native OpenCode fails closed when Node is unavailable", () => {
  assert.throws(() => nodeExecutable({
    env: { PATH: "/opt/opencode" },
    execPath: "/opt/opencode/opencode",
    platform: "linux",
    access: () => { throw new Error("missing"); },
  }), /NODE_EXECUTABLE_UNAVAILABLE/);
});
