# Data Model - Relational Database (PostgreSQL/Supabase)

This document describes the architecture of the project's relational database (PostgreSQL), managed via Supabase. The model is designed to be normalized, scalable, and secure, ensuring data integrity and query performance.

## Architecture and Technology Choices

-   **Primary Database**: PostgreSQL (via Supabase) was chosen for its robustness, relational capabilities, support for extensions (like PostGIS), and the integrated features of Supabase, such as authentication and automated APIs.
-   **Real-time Location Data**: For tracking the *current* location of users, which requires constant updates and high-speed reads, the architecture plans for the use of a NoSQL database like MongoDB.
-   **Location History**: The history of user movements is stored in PostgreSQL to enable complex relational analysis, integration with other system data, and auditing.

## Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users {
        uuid id PK
        text name
        text email
        text status
        integer points
        integer ranking
    }

    tiers {
        integer id PK
        text name
        text description
    }

    ranking {
        integer id PK
        integer tier_id FK
        integer min_points
        integer max_points
    }

    characters {
        uuid id PK
        integer tier_id FK
        text name
        integer agility
        integer strength
        integer hp
        integer defense
    }

    battles {
        uuid id PK
        uuid player1_id FK
        uuid player2_id FK
        uuid character1_id FK
        uuid character2_id FK
        uuid winner_id FK
        interval duration
        timestamptz battle_timestamp
    }

    user_location_history {
        bigint id PK
        uuid user_id FK
        decimal latitude
        decimal longitude
        timestamptz timestamp
    }

    safe_spots {
        integer id PK
        text name
        decimal latitude
        decimal longitude
    }

    users ||--o{ battles : "player1"
    users ||--o{ battles : "player2"
    users ||--o{ battles : "winner"
    users ||--o{ user_location_history : "has"
    characters ||--o{ battles : "character1"
    characters ||--o{ battles : "character2"
    tiers ||--o{ characters : "belongs to"
    tiers ||--o{ ranking : "defines"
```

## Table Schema Breakdown

Below is a detailed breakdown of each table, including the SQL code for its creation.

-----

### 1\. `users`

Stores the essential data for each user registered in the system.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key.** UUID for uniqueness and integration with Supabase Auth. |
| `name` | `text` | The user's full name. Cannot be null. |
| `email` | `text` | The user's email address. Must be unique. |
| `password` | `text` | The hashed password. **Important**: managed by Supabase Auth. |
| `points` | `integer` | The user's score. Defaults to 0. Optimized for frequent updates. |
| `ranking` | `integer` | The user's position on the leaderboard. Can be null. |
| `status` | `text` | The account status ('active', 'inactive', 'pending'). Defaults to 'active'. |
| `created_at` | `timestamptz` | The registration timestamp. |

#### Motivation and Design Choices

  - `id` as a UUID facilitates integration with external authentication systems.
  - Keeping `points` and `ranking` in this table speeds up leaderboard queries.
  - `status` allows for user lifecycle management.

-----

### 2\. `tiers`

Defines the levels or ranks for characters and users.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `serial` | **Primary Key.** Sequential identifier. |
| `name` | `text` | The name of the tier (e.g., 'S', 'A', 'Bronze'). Must be unique. |
| `description` | `text` | A brief description of what the tier represents. (Optional). |

#### Motivation and Design Choices

  - Centralizes tier definitions, allowing them to be managed dynamically without changing application logic.
  - Ensures consistency, as both the `ranking` and `characters` tables reference this one.

-----

### 3\. `ranking`

Defines the point ranges that determine which tier a user belongs to.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `serial` | **Primary Key.** |
| `tier_id` | `integer` | **Foreign Key** to `tiers.id`. |
| `min_points` | `integer` | The minimum score required for this rank. |
| `max_points` | `integer` | The maximum score for this rank. |

#### Motivation and Design Choices

  - Decouples the scoring logic from the application by moving it to the database.
  - Facilitates queries to determine a user's tier based on their points.
  - The relationship with the `tiers` table maintains data integrity.

-----

### 4\. `characters`

Stores the playable characters with their attributes and associated tier.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key.** Unique character identifier. |
| `tier_id` | `integer` | **Foreign Key** to `tiers.id`, indicating the character's strength. |
| `name` | `text` | The character's name. Must be unique. |
| `agility` | `integer` | The agility attribute. |
| `strength` | `integer` | The strength attribute. |
| `hp` | `integer` | Health Points. |
| `defense` | `integer` | The defense attribute. |

#### Motivation and Design Choices

  - The relational structure simplifies balancing, filtering, and complex queries.
  - The association with `tiers` provides a clear and manageable indication of each character's relative power.

-----

### 5\. `battles`

Records the complete history of every battle that occurred between users.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key.** Unique battle identifier. |
| `player1_id` | `uuid` | **Foreign Key** to `users.id`. |
| `player2_id` | `uuid` | **Foreign Key** to `users.id`. |
| `character1_id` | `uuid` | **Foreign Key** to `characters.id` used by player 1. |
| `character2_id` | `uuid` | **Foreign Key** to `characters.id` used by player 2. |
| `winner_id` | `uuid` | **Foreign Key** to `users.id`. Can be null in case of a draw. |
| `duration` | `interval` | The duration of the battle (e.g., '00:05:30'). |
| `battle_timestamp` | `timestamptz`| The timestamp of when the battle took place. |

#### Motivation and Design Choices

  - Essential for player history, calculating statistics (win-rate, etc.), and auditing.
  - The granular data allows for future game balancing analysis.
  - The `interval` type is optimized for duration calculations and analysis.

-----

### 6\. `safe_spots`

Stores the geographic coordinates of safe locations on the game map.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `serial` | **Primary Key.** |
| `name` | `text` | The name of the safe spot (e.g., 'Alpha Base'). |
| `latitude` | `decimal(9,6)` | The latitude coordinate with high precision. |
| `longitude`| `decimal(9,6)` | The longitude coordinate with high precision. |
| `created_at` | `timestamptz` | The timestamp when the location was registered. |

#### Motivation and Design Choices

  - A simple and efficient structure for in-game logic.
  - Using the `decimal` type is preferable to `float` for coordinates, as it avoids rounding issues.
  - **Alternative**: For advanced geographical features (e.g., "find all spots within a 5km radius"), the **PostGIS** extension would be the next step.

-----

### 7\. `user_location_history`

Maintains a record of all locations a user has visited.

| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `bigserial` | **Primary Key.** `bigserial` is used as this table can grow very large. |
| `user_id` | `uuid` | **Foreign Key** to `users.id`. |
| `latitude` | `decimal(9,6)` | The latitude coordinate. |
| `longitude`| `decimal(9,6)` | The longitude coordinate. |
| `timestamp` | `timestamptz` | The exact timestamp when the location was recorded. |

#### Motivation and Design Choices

  - Enables movement analysis, pattern detection, and route replays.
  - Storing the history in PostgreSQL allows `JOINs` with other tables (users, battles) for rich, contextual analysis.
  - The separation of *current* location (in MongoDB) and *history* (in PostgreSQL) is a strategic decision to optimize performance for frequent writes and analytical reads.

<!-- end list -->

```
```