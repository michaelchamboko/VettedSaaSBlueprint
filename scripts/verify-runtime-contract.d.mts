export type RuntimeContractPackageJson = {
  engines?: {
    node?: string;
    npm?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type RuntimeContractPackageLock = {
  lockfileVersion?: number;
  packages?: Record<string, { version?: string }>;
};

export type RuntimeContractInput = {
  packageJson?: RuntimeContractPackageJson;
  packageLock?: RuntimeContractPackageLock;
  workflowText?: string;
  nodeVersionFile?: string;
};

export declare function validateRuntimeContract(args: RuntimeContractInput): { errors: string[] };
