import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const expectedNodeVersion = "24";
const expectedNodeEngine = "24.x";
const expectedNpmEngine = ">=11 <12";
const expectedLockfileVersion = 3;

export function validateRuntimeContract({ packageJson, packageLock, nodeVersionFile }) {
  const errors = [];
  const sections = ["dependencies", "devDependencies"];
  const safePackageJson = packageJson ?? {};
  const safePackageLock = packageLock ?? {};

  if (safePackageLock?.lockfileVersion !== expectedLockfileVersion) {
    errors.push(
      `package-lock.json must use lockfileVersion ${expectedLockfileVersion}; received ${
        packageLock?.lockfileVersion ?? "missing"
      }`,
    );
  }

  for (const section of sections) {
    for (const [name, version] of Object.entries(safePackageJson[section] ?? {})) {
      if (!exactVersion.test(version)) {
        errors.push(`${section}.${name} must be an exact version; received ${version}`);
        continue;
      }
      const lockedVersion = safePackageLock.packages?.[`node_modules/${name}`]?.version;
      if (lockedVersion !== version) {
        errors.push(`${section}.${name} (${version}) does not match package-lock.json (${lockedVersion ?? "missing"})`);
      }
    }
  }

  if (safePackageJson.engines?.node !== expectedNodeEngine) {
    errors.push(`package.json engines.node must be ${expectedNodeEngine}; received ${safePackageJson.engines?.node ?? "missing"}`);
  }
  if (safePackageJson.engines?.npm !== expectedNpmEngine) {
    errors.push(`package.json engines.npm must be ${expectedNpmEngine}; received ${safePackageJson.engines?.npm ?? "missing"}`);
  }

  const normalizedNodeVersion = String(nodeVersionFile ?? "").trim();
  if (normalizedNodeVersion !== expectedNodeVersion) {
    errors.push(`.nvmrc must contain 24; received ${normalizedNodeVersion || "missing"}`);
  }

  return { errors };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let packageJson;
  let packageLock;
  let nodeVersionFile;

  try {
    packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    packageLock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
    nodeVersionFile = readFileSync(path.join(root, ".nvmrc"), "utf8");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const { errors } = validateRuntimeContract({ packageJson, packageLock, nodeVersionFile });

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log("Runtime contract verified.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
