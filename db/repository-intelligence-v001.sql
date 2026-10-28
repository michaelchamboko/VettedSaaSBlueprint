begin;

create schema if not exists repository_intelligence_v1;

create table if not exists repository_intelligence_v1.snapshots (
  snapshot_key text primary key check (snapshot_key ~ '^[0-9a-f]{64}$'),
  repository text not null,
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  source_manifest_sha256 text not null check (source_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  graph_sha256 text not null check (graph_sha256 ~ '^[0-9a-f]{64}$'),
  node_count integer not null check (node_count >= 0),
  edge_count integer not null check (edge_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists repository_intelligence_v1.nodes (
  snapshot_key text not null references repository_intelligence_v1.snapshots(snapshot_key) on delete cascade,
  node_id text not null,
  node_kind text not null,
  path text,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (snapshot_key, node_id)
);

create table if not exists repository_intelligence_v1.edges (
  snapshot_key text not null references repository_intelligence_v1.snapshots(snapshot_key) on delete cascade,
  edge_id text not null,
  from_node_id text not null,
  to_node_id text not null,
  edge_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (snapshot_key, edge_id),
  foreign key (snapshot_key, from_node_id)
    references repository_intelligence_v1.nodes(snapshot_key, node_id) on delete cascade,
  foreign key (snapshot_key, to_node_id)
    references repository_intelligence_v1.nodes(snapshot_key, node_id) on delete cascade
);

create index if not exists repository_intelligence_nodes_path_idx
  on repository_intelligence_v1.nodes (snapshot_key, path);
create index if not exists repository_intelligence_edges_from_idx
  on repository_intelligence_v1.edges (snapshot_key, from_node_id);
create index if not exists repository_intelligence_edges_to_idx
  on repository_intelligence_v1.edges (snapshot_key, to_node_id);

create or replace function repository_intelligence_v1.impact(
  requested_snapshot text,
  seed_node text,
  maximum_depth integer default 2
)
returns table (
  node_id text,
  node_kind text,
  path text,
  label text,
  depth integer,
  via_edge_kind text
)
language sql
stable
as $$
  with recursive walk(node_id, depth, via_edge_kind, visited) as (
    select seed_node, 0, null::text, array[seed_node]
    union all
    select
      case when edge.from_node_id = walk.node_id then edge.to_node_id else edge.from_node_id end,
      walk.depth + 1,
      edge.edge_kind,
      walk.visited || case when edge.from_node_id = walk.node_id then edge.to_node_id else edge.from_node_id end
    from walk
    join repository_intelligence_v1.edges edge
      on edge.snapshot_key = requested_snapshot
     and (edge.from_node_id = walk.node_id or edge.to_node_id = walk.node_id)
    where walk.depth < greatest(0, least(maximum_depth, 8))
      and not (
        case when edge.from_node_id = walk.node_id then edge.to_node_id else edge.from_node_id end
        = any(walk.visited)
      )
  )
  select node.node_id, node.node_kind, node.path, node.label, min(walk.depth)::integer,
         min(walk.via_edge_kind)
  from walk
  join repository_intelligence_v1.nodes node
    on node.snapshot_key = requested_snapshot and node.node_id = walk.node_id
  group by node.node_id, node.node_kind, node.path, node.label
  order by min(walk.depth), node.node_id;
$$;

commit;
