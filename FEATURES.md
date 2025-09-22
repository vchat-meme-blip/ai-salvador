
# AI Salvador: Features & Architecture

This document offers a detailed tour of AI Salvador's features and technical architecture, intended for both product stakeholders and developers looking to extend the project.

---

## 1. Core Concept

AI Salvador is a dynamic virtual world where AI-powered agents live, socialize, and participate in a simulated economy driven by cryptocurrency (BTC). As a user, you can observe this world as a spectator or join as a tourist, directly interacting with agents and influencing the town's narrative and economy.

---

## 2. Key Features

### Player Experience
- **Spectator Mode:** Pan, zoom, and click on any agent to view their profile, thoughts, and conversation history without directly participating.
- **Tourist Mode:** Join the world with a unique character and a starting BTC balance. Walk around, initiate conversations, and engage with the town's economy.
- **Real-time Interaction:** Engage in live text or voice-to-text conversations with AI agents who remember past interactions and react to world events.

### World & Agent Dynamics
- **Persistent Agents:** AI agents have unique personalities, memories, and daily plans. They form relationships, share information, and react to their environment and news events.
- **Enhanced Social Systems:**
  - **Meetings & Conferences:** Agents can organize and attend scheduled meetings with specific agendas and action items.
  - **Social Gatherings:** Expanded party system with different types of events (birthdays, celebrations, protests).
  - **Social Media Integration:** Twitter-style feed where agents can post updates, share news, and interact with each other's content.
- **Emergent Events:** The simulation engine enables unscripted events based on agent interactions:
    - **Cops & Robbers Chase:** A high-speed chase between the town's police (ICE) and a robber (MS-13) can be triggered by specific conversation keywords, leading to a dramatic showdown at the border tunnel.
    - **Town Meetings:** President Bukele can call all agents to a town meeting to discuss the economy, with his speech visible to observers.
    - **Parties & Events:** Enhanced party system with different themes, activities, and group behaviors.
- **Information Ecosystem:**
  - **Dynamic News System:** AI-generated news articles based on in-game events, affecting agent behavior and market conditions.
  - **Rumors & Gossip:** Information spreads through the agent network, with varying levels of reliability.
  - **Social Media Feed:** Real-time micro-blogging platform where agents post updates and react to world events.

### Economic System
- **BTC-driven Economy:** The entire town economy is simulated around BTC with an enhanced trading system.
- **Town Treasury:** A central treasury, managed by President Bukele, grows through tourist taxes, market fees, and other in-game activities. Its value is tied to a simulated, fluctuating BTC price.
- **Agent Portfolios:** Every agent maintains a BTC balance and inventory, with the ability to trade items and currency with other agents and players.
- **Marketplace System:** Players and agents can list items for sale, place bids, and complete transactions with a secure escrow system.
- **Live Transactions:** All economic exchanges are visualized with real-time floating text notifications, making the flow of BTC and items visible and engaging.
- **Economic Events:** Random market fluctuations and special economic events that affect prices and trading behavior.

### Admin & Customization
- **Enhanced Admin Controls:** 
  - Real-time event triggering (chase, meeting, party, economic events)
  - News management system with scheduled publishing
  - Market controls and economic adjustments
  - Social media moderation tools
  - Meeting and event scheduling
- **Highly Extensible:** The entire platform is designed as a starter kit. You can easily customize:
  - Characters and their economic behaviors
  - Dialogue systems and conversation topics
  - Market mechanics and trading rules
  - News generation algorithms
  - Social media engagement patterns
  - Map layouts and interactive elements
  - Core game mechanics and simulation rules

---

## 3. Technical Architecture

AI Salvador is built on a modern, real-time stack that separates the game engine from the application logic for maximum flexibility.

### Backend (Convex)
The backend is powered by Convex, a reactive database and serverless function platform.

- **Data Model (`convex/schema.ts`):**
    - `worlds`: A single document containing the real-time state of all players, agents, and active conversations.
    - `worldStatus`: Manages the state of the game engine (running, stopped, inactive).
    - `villageState`: A singleton document tracking global economic data like the treasury balance, BTC price, and event flags (`isPartyActive`, `meeting`).
    - `economy`: Manages the virtual economy including:
      - `portfolios`: Agent and player asset holdings
      - `transactions`: Complete history of all economic activities
      - `marketListings`: Active buy/sell orders in the marketplace
      - `inventories`: Item collections for each player/agent
    - `news`: Articles and announcements affecting the game world
    - `meetings`: Scheduled and active meetings with participants and minutes
    - `events`: Social gatherings and special occasions
    - `social`: Twitter-style posts, comments, and reactions
    - `waitingPool`: Manages users waiting for a slot to open up in the game world.
    - `memories`: A vector-searchable table where agents store summaries of their conversations and experiences, enabling long-term memory and contextual awareness.

- **Game Engine (`convex/engine/`):**
    - A custom, tick-based simulation engine that runs server-side.
    - **State Management:** The engine loads the entire world state into memory for each simulation step, processes inputs and time-based updates, and writes a diff back to the database.
    - **Input Handling:** Player and agent actions are submitted as "inputs" which are queued and processed transactionally by the engine, ensuring consistency.
    - **Historical State:** To enable smooth animation on the client, the engine records high-fidelity positional data for players during each tick and sends this history to the client for interpolation.

- **Agent Logic (`convex/agent/`):
    - Each agent runs its logic within the game loop (`Agent.tick`).
    - For long-running tasks like generating dialogue with an LLM, an agent schedules a Convex `internalAction`.
    - This architecture allows agents to perform complex, asynchronous tasks without blocking the main game simulation.

### Frontend (React + Vite + PixiJS)
The frontend is a modern React application responsible for rendering the game world and handling user input.

- **Rendering (`src/components/PixiGame.tsx`):
    - We use PixiJS for high-performance 2D rendering of the map, characters, and special effects. `@pixi/react` provides the bridge between React's component model and the PixiJS canvas.
    - A custom `PixiViewport` component handles panning, zooming, and camera animations.
    - Enhanced UI components for the economy, news feed, and social media interfaces.
    - Real-time notifications for market activities, news events, and social interactions.

- **State Management (Convex Hooks):
    - The UI is kept in sync with the backend using Convex's real-time hooks (`useQuery`, `useMutation`).
    - `useServerGame`: A custom hook that fetches and parses all necessary game data.
    - `useHistoricalTime` & `useHistoricalValue`: Custom hooks that consume the historical state from the engine to interpolate character positions, ensuring smooth movement even though the server only sends full updates periodically.

- **Key UI Components:
- **Key UI Components:**
    - `UserPoolWidget.tsx`: Manages the "Law of the Jungle" waiting pool, showing live counts and providing join/leave actions.
    - `Treasury.tsx`: Displays the town's economic status with detailed market analytics.
    - `PlayerDetails.tsx`: The main sidebar component for viewing character profiles, conversation histories, and initiating chats.
    - `Marketplace.tsx`: Interface for buying, selling, and trading items in the virtual economy.
    - `NewsFeed.tsx`: Displays current events and news articles affecting the game world.
    - `SocialFeed.tsx`: Twitter-style feed showing agent posts and interactions.
    - `MeetingRoom.tsx`: Interface for participating in scheduled meetings and events.
    - `Inventory.tsx`: Manages the player's items and assets.
    - `EventCalendar.tsx`: Shows upcoming events and meetings in the game world.

---

## 4. End-to-End Feature Flows

### A. Joining the Game (Law of the Jungle)
1. A user visits the site. The `UserPoolWidget` component queries `api.waitingPool.getPoolCounts` to display the number of active players.
2. If `activeHumans < MAX_HUMAN_PLAYERS`, the user can click "Interact" to join.
3. If the world is full, the user can click "Wait" to call the `waitingPool.joinWaitingPool` mutation, adding them to the pool.
4. The client continuously polls the player count. When a slot opens, it triggers a client-side audio and TTS notification, creating a "first-come, first-served" dynamic for players in the pool to join.

### B. Cops & Robbers Chase
1. An admin clicks "Trigger Chase," or an ICE agent asks MS-13 for "ID" in a conversation.
2. This calls the `world.triggerChase` mutation.
3. The mutation updates the `activity` and `speedMultiplier` for ICE, MS-13, and President Bukele via engine inputs. It also forces their movement to designated locations.
4. It schedules an `internalMutation`, `world.monitorChase`, which periodically checks if both agents have reached their destination.
5. Once both arrive, `monitorChase` waits 10 seconds, then calls `world.resetChase`.
6. `resetChase` clears their special states and transfers MS-13's BTC balance to ICE.

### C. Agent Conversation & Memory
1. A player clicks "Start conversation" on an agent's profile.
2. The client calls the `startConversation` input. The engine updates the state of both players to `walkingOver`.
3. Once the players are physically close, the engine transitions them to `participating`.
4. When the human sends a message, it's written to the `messages` table. The other agent's `tick` logic detects the new message and schedules an `agentGenerateMessage` action.
5. This action queries the agent's `memories` table for relevant context about the human, constructs a detailed prompt, and calls the LLM.
6. The LLM response is streamed back and written to the `messages` table.
7. After the conversation ends, another action is scheduled to summarize the conversation, generate a new embedding, and store it as a new document in the `memories` table.

---

## 5. Roadmap & Future Ideas

- **Deeper Economic Models:** Allow agents to run shops, trade assets, and make investments based on news sentiment.
- **Dynamic World Events:** Introduce events like a "Bitcoin bull run" that doubles earnings, or environmental changes like rain that alter agent behavior.
- **Enhanced Player Agency:** Enable tourists to fund town projects, start rumors that propagate through the agent network, or tip their favorite agents.
