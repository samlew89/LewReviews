# Video Response Chains - Architecture Document

## Overview

Response chains allow users to create video "responses" to other videos, similar to TikTok duets/stitches or YouTube video responses. This creates threaded conversation chains that encourage engagement and community interaction.

---

## 1. Data Model Design

### Core Schema

The response chain system uses a self-referential `parent_video_id` foreign key on the videos table:

```sql
-- videos table with response chain support
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,

  -- Response Chain Fields
  parent_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  root_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  chain_depth INTEGER DEFAULT 0 CHECK (chain_depth <= 10),
  response_type VARCHAR(20) CHECK (response_type IN ('reply', 'duet', 'stitch')),

  -- Denormalized Counts (for performance)
  response_count INTEGER DEFAULT 0,
  total_chain_responses INTEGER DEFAULT 0,

  -- Metadata
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT no_self_response CHECK (parent_video_id != id)
);

-- Indexes for efficient querying
CREATE INDEX idx_videos_parent_id ON videos(parent_video_id) WHERE parent_video_id IS NOT NULL;
CREATE INDEX idx_videos_root_id ON videos(root_video_id) WHERE root_video_id IS NOT NULL;
CREATE INDEX idx_videos_user_responses ON videos(user_id, parent_video_id) WHERE parent_video_id IS NOT NULL;
CREATE INDEX idx_videos_chain_depth ON videos(chain_depth);
```

### Key Design Decisions

#### `parent_video_id` - Direct Parent Reference
- Points to the immediate video being responded to
- `NULL` for original/root videos
- `ON DELETE SET NULL` preserves responses when parent is deleted

#### `root_video_id` - Chain Root Reference
- Points to the original video that started the chain
- Enables efficient "show all responses in this conversation" queries
- Denormalized for performance (avoids recursive queries)

#### `chain_depth` - Nesting Level
- 0 = original video
- 1 = direct response
- 2 = response to a response
- Hard limit of 10 to prevent infinite nesting
- Enforced at application level AND database constraint

#### `response_type` - Response Style
- `reply` - Standard response (shown sequentially)
- `duet` - Side-by-side playback with original
- `stitch` - Original clip + response (sequential)

---

## 2. Query Patterns

### Pattern 1: Fetch Video with Direct Responses

```sql
-- Get a video with its immediate responses
SELECT
  v.*,
  parent.id AS parent_id,
  parent.title AS parent_title,
  parent.thumbnail_url AS parent_thumbnail,
  parent.user_id AS parent_user_id,
  parent_user.username AS parent_username,
  (
    SELECT COUNT(*)
    FROM videos r
    WHERE r.parent_video_id = v.id AND r.status = 'active'
  ) AS live_response_count
FROM videos v
LEFT JOIN videos parent ON v.parent_video_id = parent.id
LEFT JOIN users parent_user ON parent.user_id = parent_user.id
WHERE v.id = $1;
```

### Pattern 2: Fetch Response Tree (Recursive CTE)

```sql
-- Fetch entire response tree from a root video
WITH RECURSIVE response_tree AS (
  -- Base case: the root video
  SELECT
    id, title, user_id, parent_video_id, chain_depth,
    created_at, response_type, status,
    ARRAY[id] AS path,
    0 AS level
  FROM videos
  WHERE id = $1 AND status = 'active'

  UNION ALL

  -- Recursive case: all responses
  SELECT
    v.id, v.title, v.user_id, v.parent_video_id, v.chain_depth,
    v.created_at, v.response_type, v.status,
    rt.path || v.id,
    rt.level + 1
  FROM videos v
  INNER JOIN response_tree rt ON v.parent_video_id = rt.id
  WHERE v.status = 'active' AND rt.level < 10
)
SELECT * FROM response_tree
ORDER BY path;
```

### Pattern 3: Flat List of All Responses (Using root_video_id)

```sql
-- Fast flat query using denormalized root_video_id
SELECT v.*, u.username, u.avatar_url
FROM videos v
JOIN users u ON v.user_id = u.id
WHERE v.root_video_id = $1 AND v.status = 'active'
ORDER BY v.created_at DESC
LIMIT 50 OFFSET $2;
```

### Pattern 4: Response Chain Breadcrumbs

```sql
-- Get the path from a response back to root
WITH RECURSIVE chain_path AS (
  SELECT id, title, user_id, parent_video_id, 1 AS depth
  FROM videos WHERE id = $1

  UNION ALL

  SELECT v.id, v.title, v.user_id, v.parent_video_id, cp.depth + 1
  FROM videos v
  INNER JOIN chain_path cp ON v.id = cp.parent_video_id
  WHERE cp.depth < 11
)
SELECT * FROM chain_path ORDER BY depth DESC;
```

---

## 3. Recursive vs Flat Structure Trade-offs

### Recursive Structure (Tree)

**Pros:**
- Natural representation of conversation threads
- Easy to display nested comment-style UI
- Preserves exact conversation flow

**Cons:**
- Complex queries (CTEs have performance overhead)
- Difficult pagination
- UI complexity for deep nesting

**Use When:**
- Displaying full conversation context
- Building thread visualization
- Chain depth is typically shallow (< 5 levels)

### Flat Structure (List)

**Pros:**
- Simple queries using `root_video_id`
- Easy pagination
- Better performance at scale
- Works well with infinite scroll

**Cons:**
- Loses hierarchical context
- Need additional UI work to show relationships
- May confuse users about conversation flow

**Use When:**
- "All responses" view
- Feed integration
- Mobile-first interfaces
- High volume scenarios

### Recommended Hybrid Approach

1. **Store both** `parent_video_id` AND `root_video_id`
2. **Default to flat** for response lists with parent indicator
3. **Use recursive** only for "show conversation" feature
4. **Lazy load** deep chains on demand

---

## 4. Database Triggers

```sql
-- Trigger to maintain denormalized counts
CREATE OR REPLACE FUNCTION update_response_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_video_id IS NOT NULL THEN
    -- Update direct parent's response count
    UPDATE videos
    SET response_count = response_count + 1,
        updated_at = NOW()
    WHERE id = NEW.parent_video_id;

    -- Update root's total chain count
    IF NEW.root_video_id IS NOT NULL THEN
      UPDATE videos
      SET total_chain_responses = total_chain_responses + 1
      WHERE id = NEW.root_video_id;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Handle status changes (soft delete)
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE videos SET response_count = response_count - 1
      WHERE id = NEW.parent_video_id AND response_count > 0;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE videos SET response_count = response_count + 1
      WHERE id = NEW.parent_video_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_response_count_trigger
AFTER INSERT OR UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION update_response_counts();

-- Trigger to set root_video_id and validate chain_depth
CREATE OR REPLACE FUNCTION set_response_chain_fields()
RETURNS TRIGGER AS $$
DECLARE
  parent_root_id UUID;
  parent_depth INTEGER;
BEGIN
  IF NEW.parent_video_id IS NOT NULL THEN
    -- Get parent's root and depth
    SELECT root_video_id, chain_depth
    INTO parent_root_id, parent_depth
    FROM videos WHERE id = NEW.parent_video_id;

    -- Set root_video_id (parent's root, or parent if parent is root)
    NEW.root_video_id := COALESCE(parent_root_id, NEW.parent_video_id);

    -- Set chain_depth
    NEW.chain_depth := COALESCE(parent_depth, 0) + 1;

    -- Enforce max depth
    IF NEW.chain_depth > 10 THEN
      RAISE EXCEPTION 'Maximum response chain depth (10) exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_chain_fields_trigger
BEFORE INSERT ON videos
FOR EACH ROW EXECUTE FUNCTION set_response_chain_fields();
```

---

## 5. Circular Response Prevention

Circular responses are prevented through multiple layers:

1. **Self-reference constraint**: `CHECK (parent_video_id != id)`
2. **Created_at ordering**: Videos can only respond to older videos (enforced in application)
3. **Application validation**: Check proposed parent isn't already in user's response chain

```sql
-- Check if responding would create a cycle (application-level validation)
CREATE OR REPLACE FUNCTION would_create_cycle(
  proposed_parent_id UUID,
  responding_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  is_cycle BOOLEAN;
BEGIN
  WITH RECURSIVE chain AS (
    SELECT id, parent_video_id, user_id FROM videos WHERE id = proposed_parent_id
    UNION ALL
    SELECT v.id, v.parent_video_id, v.user_id
    FROM videos v
    INNER JOIN chain c ON v.id = c.parent_video_id
  )
  SELECT EXISTS(
    SELECT 1 FROM chain WHERE user_id = responding_user_id
  ) INTO is_cycle;

  RETURN is_cycle;
END;
$$ LANGUAGE plpgsql;
```
