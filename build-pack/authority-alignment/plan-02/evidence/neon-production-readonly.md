# Neon production read-only verification

## Scope

Read-only inspection of project winter-truth-98410571, production branch br-spring-smoke-a65esjkh, database neondb.

## Latest repository-intelligence snapshot

- Snapshot key: 75df1e3b891500d9474ef151af90e296060347a590b225bd349319724a53032c.
- Source commit: 68b1580f18eed3aacce76a108fb196331dbf80a7.
- Source-manifest digest: fa4d058c60c874aa412936248e7298539d946988bb2023ee47a79a2943568d53.
- Graph digest: 13fc7548dcc06c241446c8cc89e5e1daed170d47d0bf644ba17842fa9f264045.
- Recorded and actual node counts: 3,238.
- Recorded and actual edge counts: 12,511.
- Dangling edges: 0.

The source commit is the reviewed PR head. Its tree is identical to the deployed merge commit tree.

## Constraints observed

- Snapshot key is the snapshot primary key and must be a 64-character lowercase hexadecimal digest.
- Nodes are unique by (snapshot_key, node_id).
- Edges are unique by (snapshot_key, edge_id).
- Every node references an existing snapshot.
- Every edge references its snapshot and both endpoint nodes.
- Commit, manifest, and graph digests have format checks.
- Node and edge counts must be non-negative.

## Production deployment identity

- Vercel deployment: dpl_FJBRCqAUXTYRmEvoJ2EwBoshziyc.
- State: READY.
- Target: production.
- Git commit: ccc2e1de3206f21b4e710fbc70c1e783079e0b69.
- Public /api/deployment: HTTP 200 and reports the same production commit.

## Limits

These queries prove current referential integrity and count consistency. They do not exercise transaction rollback after an injected mid-import failure. The code uses one transaction for snapshot, node, and edge replacement, but a database-backed failure-path test is currently absent.
