# Distributed Systems Design

## The CAP Theorem

The CAP theorem states that a distributed system can only guarantee two of the following three properties simultaneously:

- **Consistency** — Every read receives the most recent write
- **Availability** — Every request receives a response (success or failure)
- **Partition tolerance** — The system continues to operate despite network partitions

In practice, network partitions are inevitable in distributed systems, so the real choice is between **consistency and availability**. This tradeoff is fundamental to system design.

### Consistency vs Availability Tradeoffs

**CP systems** (Consistency + Partition tolerance):
- Choose correctness over availability
- May reject requests during partitions
- Examples: ZooKeeper, HBase, MongoDB (default config)
- Best for: financial transactions, inventory systems

**AP systems** (Availability + Partition tolerance):
- Choose responsiveness over correctness
- May serve stale data during partitions
- Examples: Cassandra, DynamoDB, CouchDB
- Best for: social media feeds, caching layers, analytics

Most real-world systems use a spectrum between strict consistency and eventual consistency, tuning per-operation or per-table.

## Consensus Algorithms

### The Raft Algorithm

Raft is a consensus algorithm designed to be understandable. It breaks consensus into three sub-problems:

1. **Leader election** — When the current leader fails, a new leader must be chosen
2. **Log replication** — The leader accepts log entries and replicates them to followers
3. **Safety** — If a server has applied a log entry, no other server will apply a different entry for the same index

#### Leader Election in Raft

Nodes can be in one of three states: follower, candidate, or leader.

- All nodes start as **followers**
- If a follower doesn't hear from a leader within its election timeout, it becomes a **candidate**
- The candidate requests votes from other nodes
- If it receives a majority of votes, it becomes the **leader**
- The leader sends periodic heartbeats to maintain authority

Election timeouts are randomized (e.g., 150-300ms) to avoid split votes. If no candidate wins, a new election begins with incremented term numbers.

### Paxos

Paxos is the foundational consensus algorithm, but it's notoriously difficult to understand and implement. Most modern systems prefer Raft for its clarity.

## Replication Strategies

### Datacenter Replication and Sync

When running services across multiple datacenters, you need a replication strategy:

**Synchronous replication**:
- Every write waits for all replicas to acknowledge
- Guarantees strong consistency
- High latency (round-trip to remote datacenter)
- Risk: single slow replica blocks all writes

**Asynchronous replication**:
- Writes return immediately after local commit
- Replicas receive updates in the background
- Low latency, high throughput
- Risk: data loss if primary fails before replication

**Semi-synchronous replication**:
- Write waits for at least N replicas (e.g., 1 local + 1 remote)
- Balance between consistency and performance
- Used by MySQL Group Replication, CockroachDB

### Conflict Resolution

With multi-leader or leaderless replication, concurrent writes can conflict:

- **Last-write-wins (LWW)** — Timestamp-based, simple but can lose data
- **Vector clocks** — Track causal dependencies, detect true conflicts
- **CRDTs** — Conflict-free data structures that merge automatically
- **Application-level resolution** — Let the user decide (e.g., Google Docs)

## Partitioning (Sharding)

Distribute data across nodes to handle scale:

- **Hash partitioning** — Consistent hashing distributes keys evenly
- **Range partitioning** — Useful for ordered scans, risk of hot spots
- **Composite partitioning** — Combine hash and range (e.g., hash on tenant, range on timestamp)

## Monitoring and Observability

Distributed systems are complex — invest heavily in:

- Distributed tracing (Jaeger, Zipkin)
- Centralized logging (ELK, Loki)
- Metrics and alerting (Prometheus, Grafana)
- Chaos engineering (test failure modes in production)
