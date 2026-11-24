import { Pool } from "pg";
import { assertDocumentSeed, DOCUMENT_NODE_KINDS, type DocumentIntelligenceSnapshot } from "./graph";

const SCHEMA = "repository_intelligence_v1";

export class NeonDocumentIntelligence {
  constructor(private readonly pool: Pool) {}

  async replaceSnapshot(snapshot: DocumentIntelligenceSnapshot): Promise<void> {
    if (snapshot.nodes.some((node) => !DOCUMENT_NODE_KINDS.some((kind) => kind === node.kind)) || snapshot.edges.some((edge) => edge.kind === "imports")) {
      throw new Error("Only document intelligence snapshots may be written to Neon.");
    }
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

  async documentImpact(snapshotKey: string, nodeId: string, depth: number): Promise<Array<Record<string, unknown>>> {
    assertDocumentSeed(nodeId);
    if (!Number.isInteger(depth) || depth < 0 || depth > 8) throw new Error("Depth must be an integer from 0 to 8.");
    const result = await this.pool.query(
      `with recursive semantic_nodes as (
         select * from ${SCHEMA}.nodes where snapshot_key = $1 and node_kind = any($4::text[])
       ), semantic_edges as (
         select edge.* from ${SCHEMA}.edges edge
         join semantic_nodes source on source.node_id = edge.from_node_id
         join semantic_nodes target on target.node_id = edge.to_node_id
         where edge.snapshot_key = $1 and edge.edge_kind <> 'imports'
       ), walk(node_id, depth) as (
         select node_id, 0 from semantic_nodes where node_id = $2
         union
         select case when edge.from_node_id = walk.node_id then edge.to_node_id else edge.from_node_id end, walk.depth + 1
         from walk join semantic_edges edge on edge.from_node_id = walk.node_id or edge.to_node_id = walk.node_id
         where walk.depth < $3
       )
       select node.node_id, node.node_kind, node.path, node.label, min(walk.depth)::integer as depth
       from walk join semantic_nodes node on node.node_id = walk.node_id
       group by node.node_id, node.node_kind, node.path, node.label
       order by min(walk.depth), node.node_id`,
      [snapshotKey, nodeId, depth, [...DOCUMENT_NODE_KINDS]],
    );
    return result.rows;
  }
}
