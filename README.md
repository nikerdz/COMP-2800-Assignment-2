# COMP-2800 Assignment 2  
## Space Invaders Web Game

This project is a browser-based **Space Invaders style game** created in **JavaScript** for **COMP-2800: Software Development**.

The player controls a spaceship at the bottom of the screen, moves left and right, and shoots lasers upward to destroy enemy ships before they reach the hero or eliminate all lives.

---

## Features

- Player movement using keyboard controls
- Laser shooting with cooldown
- Multiple rows of enemies
- Enemy movement across the screen
- Random enemy laser attacks
- Collision detection
- Score tracking
- Life system
- Win and loss conditions
- Restart option after the game ends

---

## Project Structure

```text
COMP-2800-Assignment-2/
│
├── assets/
│   ├── enemyShip.png
│   ├── laserRed.png
│   ├── life.png
│   └── player.png
│
├── app.js
├── index.html
├── package.json
└── README.md
````

---

## How to Run

### Option 1: GitHub Codespaces

1. Open the project in **GitHub Codespaces**
2. Run:

```bash
npm start
```

3. Open the forwarded port in your browser

### Option 2: Local Development Server

You can also run the project using a local server such as:

* VS Code Live Server
* Python HTTP server
* any simple static file server

Example with Python:

```bash
python -m http.server 8000
```

Then open the browser to:

```text
http://localhost:8000
```

---

## Controls

* **Left Arrow** → Move left
* **Right Arrow** → Move right
* **Space** → Fire laser
* **Enter** → Restart game after win/loss

---

## Gameplay Rules

* The hero starts with **3 lives**
* Each enemy destroyed gives **100 points**
* The game ends in a **win** when all enemies are eliminated
* The game ends in a **loss** if:

  * the hero loses all lives, or
  * an enemy reaches the hero's row

---

## Technologies Used

* **HTML5**
* **CSS3**
* **JavaScript (ES6)**
* **Canvas API**

---

## Assets

The game uses the following image assets inside the `assets/` folder:

* `enemyShip.png` – enemy sprite
* `player.png` – player ship sprite
* `laserRed.png` – laser sprite
* `life.png` – life icon shown on screen

---

## Implementation Overview

This game is built around:

* an **event-driven system** using a custom `EventEmitter`
* a base `GameObject` class for shared object behavior
* subclasses for:

  * `Hero`
  * `Enemy`
  * `Laser`

The game loop continuously:

1. updates object positions
2. checks collisions
3. removes destroyed objects
4. redraws the scene

---

## Possible Future Improvements

* Different enemy types
* Level progression
* Sound effects and music
* Explosion animations
* Pause functionality
* Start screen / menu
* High score tracking

---

## References
The images used in this project and the design of the game were sourced from the following tutorial:
https://github.com/microsoft/Web-Dev-For-Beginners