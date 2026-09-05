# 🏙️ MUMBAI RUSH

### **SURVIVE THE RUSH. OWN THE STREETS.**

MUMBAI RUSH is an original **3D Mumbai-themed endless runner** built for modern web browsers with a strong focus on **mobile gameplay, performance, and an immersive Mumbai atmosphere**.

Run through Mumbai-inspired streets, dodge traffic, collect coins, use power-ups, perform near misses, complete missions, and survive as long as possible while the city gets faster and more challenging.

---

## 🎮 Game Concept

Mumbai is moving. Traffic is everywhere. The roads never stop.

> **RUN. DODGE. COLLECT. SURVIVE.**

MUMBAI RUSH combines endless-runner gameplay with an original Mumbai-inspired environment featuring:

- 🚕 Black & yellow taxis
- 🛺 Auto-rickshaws
- 🚌 City buses
- 🚗 Cars
- 🏍️ Motorcycles
- 🚚 Trucks
- 🏙️ City streets
- 🌉 Flyovers
- 🛍️ Markets
- 🌊 Coastal roads
- 🌧️ Monsoon environments
- 🌙 Night environments

---

## ✨ Features

### 🏃 Endless Runner
- Automatic forward running
- Three-lane movement
- Smooth lane switching
- Jump and slide
- Increasing difficulty
- Procedurally generated road
- Endless gameplay

### 🎯 Controls

| Action | Desktop |
|---|---|
| Move Left | `A` / `←` |
| Move Right | `D` / `→` |
| Jump | `W` / `↑` / `Space` |
| Slide | `S` / `↓` |
| Pause | `P` |
| Restart | `R` |

**Mobile:** Swipe left/right to change lanes, swipe up to jump, swipe down to slide.

---

## 🚦 Traffic & Obstacles

Vehicles include taxis, auto-rickshaws, buses, cars, motorcycles and trucks.

Obstacles include road barriers, barricades, concrete dividers, traffic blocks, construction obstacles and overhead obstacles.

---

## 🪙 Coins

Collect rotating coins arranged in:

- Straight lines
- Zig-zags
- Lane sequences
- Arcs
- Risk/reward formations

---

## ⚡ Power-Ups

### ☕ Cutting Chai
Slows down the world temporarily.

### 🛺 Auto Shield
Protects from one collision.

### 🚆 Local Express
Increases speed and score potential.

### 🌧️ Monsoon Dash
Provides a temporary speed boost with special effects.

---

## 💥 Near Miss

Narrowly avoid traffic to earn:

```text
+50 SCORE
NEAR MISS!
```

Near misses can contribute to the score multiplier.

---

## 📈 Scoring

```text
Distance
+ Coins
+ Near Misses
+ Power-Up Bonuses
+ Mission Bonuses
```

Multiplier progression:

```text
x1 → x2 → x3 → x4 → x5
```

---

## 🗺️ Mumbai Environments

- 🏙️ **Mumbai Streets** — dense city streets, shops and traffic
- 🌉 **Flyover** — elevated roads and skyline
- 🛍️ **Market** — busy shops, stalls and obstacles
- 🌊 **Coastal Road** — sea, palms and skyline
- 🌧️ **Monsoon** — rain, wet roads and puddles
- 🌙 **Night** — streetlights, headlights and building lights

---

## 🧑 Characters

Original characters include:

- **Aarav** — College Student
- **Delivery Rider**
- **Office Commuter**
- **Cricket Player**
- **Cyclist**
- **Street Artist**

Planned cosmetics include jackets, helmets, caps, bags, glasses, shoes and Mumbai-inspired accessories.

---

## 🎯 Missions

Example missions:

- Run a specific distance
- Collect coins
- Perform near misses
- Survive for a duration
- Use power-ups
- Complete special environments

Mission flow:

```text
LOCKED → ACTIVE → COMPLETED → REWARD CLAIMED
```

---

## 🏆 Achievements

Planned achievements include:

- 🏃 First Run
- 📏 1000M Runner
- 🪙 Coin Collector
- 🚦 Traffic Master
- 💥 Near Miss King
- 🌧️ Monsoon Survivor
- 🌙 Night Runner
- 💰 Millionaire

---

## 🎨 Visual Style

Stylized low-poly 3D with a premium, modern, clean and Mumbai-inspired visual direction.

---

## 🔊 Audio

Includes running, jump, slide, coin, traffic, collision, near-miss, power-up, UI and background audio using lightweight browser audio technology.

---

## 💾 Save System

Local browser storage can preserve:

- High score
- Best distance
- Total coins
- Selected/unlocked characters
- Cosmetics
- Missions and rewards
- Achievements
- Settings
- Statistics

No account or backend is required for the core game.

---

## ⚡ Performance

Designed for mobile performance using:

- Object pooling
- Shared geometries/materials
- Procedural world generation
- Lightweight collision detection
- Limited particles
- Efficient animation loops

Target: **30–60 FPS on mid-range Android devices.**

---

## 🛠️ Technology

- HTML5
- CSS3
- JavaScript
- Three.js
- Web Audio API
- LocalStorage
- Browser Touch Events

---

## 📂 Project Structure

```text
MUMBAI-RUSH/
├── index.html
├── css/
├── js/
│   ├── main.js
│   ├── game.js
│   ├── player.js
│   ├── world.js
│   ├── traffic.js
│   ├── coins.js
│   ├── powerups.js
│   ├── characters.js
│   ├── missions.js
│   ├── achievements.js
│   ├── audio.js
│   ├── storage.js
│   └── ui.js
├── assets/
└── README.md
```

> The exact structure may vary with the current implementation.

---

## 🚀 Running Locally

```bash
git clone https://github.com/YOUR-USERNAME/mumbai-rush.git
cd mumbai-rush
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

---

## 🌐 Deployment

Suitable for static hosting such as:

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

---

## 📱 Mobile Support

Designed primarily for mobile browsers, especially Android Chrome and modern Chromium-based browsers.

---

## 🔐 Privacy

MUMBAI RUSH does not require user accounts, passwords, personal information or a backend database. Gameplay progression is stored locally in the browser.

---

## 🎯 Development Roadmap

### Core Gameplay
- [x] 3D environment
- [x] Three-lane movement
- [x] Jump
- [x] Slide
- [x] Touch controls
- [x] Desktop controls
- [x] Endless road

### Traffic
- [x] Vehicles
- [x] Obstacles
- [x] Collision system
- [x] Traffic spawning
- [x] Difficulty scaling
- [x] Object pooling

### Scoring
- [x] Coins
- [x] Coin formations
- [x] Score
- [x] Distance
- [x] High score
- [x] Near misses
- [x] Multiplier

### Power-Ups
- [x] Cutting Chai
- [x] Auto Shield
- [x] Local Express
- [x] Monsoon Dash

### World
- [x] Mumbai Streets
- [x] Flyover
- [x] Market
- [x] Coastal Road
- [ ] Full Monsoon system
- [ ] Full Night system

### Progression
- [x] Characters
- [ ] Full character customization
- [x] Missions
- [ ] Mission reward claiming
- [ ] Achievements

### Polish & Release
- [ ] Advanced VFX
- [ ] Improved vehicle models
- [ ] Advanced lighting
- [ ] Rain effects
- [ ] Night lighting
- [ ] Advanced audio
- [ ] Performance optimization
- [ ] Extensive Android testing
- [ ] Final QA
- [ ] Production optimization
- [ ] Final UI polish

---

## 🤝 Contributing

Before making major changes:

1. Understand the existing architecture.
2. Avoid rewriting working systems.
3. Keep the game lightweight.
4. Maintain mobile performance.
5. Test gameplay after changes.
6. Avoid copyrighted assets.
7. Keep the Mumbai-inspired identity original.

---

## 📜 License

Choose an appropriate open-source license before publishing the repository publicly.

For example, use the **MIT License** if you want to allow broad reuse and modification.

---

## ❤️ Project Philosophy

> **Mumbai never stops moving. Neither should you.**

### FOCUS → RUN → DODGE → SURVIVE → PROGRESS

---

# 🏙️ MUMBAI RUSH

## **SURVIVE THE RUSH. OWN THE STREETS.**
