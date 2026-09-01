declare module "oracledb" {
  export interface PoolAttributes {
    user?: string;
    password?: string;
    connectString: string;
    walletLocation?: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
    poolTimeout?: number;
  }

  export interface Metadata<T = unknown> {
    name: string;
    dbType?: T;
  }

  export interface Result<T = unknown> {
    rows?: T[];
    metaData?: Metadata<T>[];
  }

  export interface Connection {
    execute(
      sql: string,
      binds?: unknown[],
      options?: unknown
    ): Promise<Result<unknown>>;
    close(force?: number): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  export const OUT_FORMAT_ARRAY: number;

  export function createPool(config: PoolAttributes): Promise<Pool>;

  const oracledb: {
    OUT_FORMAT_ARRAY: number;
    createPool(config: PoolAttributes): Promise<Pool>;
  };

  export default oracledb;
}
