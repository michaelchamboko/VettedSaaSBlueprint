import { Pool } from "pg";
import type { IntelligenceSnapshot } from "./graph";

const SCHEMA = "repository_intelligence_v1";

export class NeonRepositoryIntelligence {
  constructor(private readonly pool: Pool) {}

  async replaceSnapshot(snapshot: IntelligenceSnapshot): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into ${SCHEMA}.snapshots
          (snapshot_key, repository, commit_sha, source_manifest_sha256, graph_sha256, node_count, edge_count)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (snapshot_key) do update set
           node_count = excluded.node_count, edge_count = excluded.edge_count`,
        [snapshot.snapshotKey, snapshot.repository, snapshot.commitSha, snapshot.sourceManifestSha256, snapshot.graphSha256, snapshot.nodes.length, snapshot.edges.length],
      );
      await client.query(`delete from ${SCHEMA}.edges where snapshot_key = $1`, [snapshot.snapshotKey]);
      await client.query(`delete from ${SCHEMA}.nodes where snapshot_key = $1`, [snapshot.snapshotKey]);
      await client.query(
        `insert into ${SCHEMA}.nodes (snapshot_key, node_id, node_kind, path, label, payload)
         select $1, item.id, item.kind, item.path, item.label, item.payload
         from jsonb_to_recordset($2::jsonb)
           as item(id text, kind text, path text, label text, payload jsonb)`,
        [snapshot.snapshotKey, JSON.stringify(snapshot.nodes)],
      );
      await client.query(
        `insert into ${SCHEMA}.edges (snapshot_key, edge_id, from_node_id, to_node_id, edge_kind, payload)
         select $1, item.id, item."from", item."to", item.kind, item.payload
         from jsonb_to_recordset($2::jsonb)
           as item(id text, "from" text, "to" text, kind text, payload jsonb)`,
        [snapshot.snapshotKey, JSON.stringify(snapshot.edges)],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async impact(snapshotKey: string, nodeId: string, depth: number): Promise<Array<Record<string, unknown>>> {
    const result = await this.pool.query(
      `select * from ${SCHEMA}.impact($1, $2, $3)`,
      [snapshotKey, nodeId, depth],
    );
    return result.rows;
  }
}
