# Rollback Plan

Before implementation, rollback means deleting only the generated candidate pack and its generator/test additions. During later work, each managed task worktree is disposable until verified integration. Migration must retain the prior GitHub commit and live Vercel deployment as rollback references; failed post-deployment health checks must restore the preserved production reference. Force-push, unique-branch deletion, dirty-worktree removal, and silent domain changes are prohibited.
