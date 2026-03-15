// COMP 2800 - Assignment 2
// Space Invaders style game
// Anika Khan
// ID: 110103345

/*
  Messages used by the custom event system.
  These help different parts of the game communicate with each other
  without tightly coupling all logic together.
*/
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
};

/*
  Simple event emitter class.
  Lets the game subscribe to and trigger named events.
*/
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  // Register a listener function for a message
  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }

  // Trigger all listeners attached to a message
  emit(message, payload) {
    const listeners = this.listeners[message];
    if (!listeners) return;
    listeners.forEach((listener) => listener(payload));
  }

  // Remove all listeners
  clear() {
    this.listeners = {};
  }
}

/*
  Base class for anything that appears in the game.
  Hero, enemies, and lasers all inherit from this class.
*/
class GameObject {
  constructor(x, y, width, height, type, img) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.img = img;
    this.dead = false;
  }

  // Draw the object image on the canvas unless it is marked dead
  draw(ctx) {
    if (this.dead) return;
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }

  // Return a rectangle representation used for collision detection
  rectFromGameObject() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height,
    };
  }
}

/*
  The player-controlled hero ship.
*/
class Hero extends GameObject {
  constructor(x, y, width, height, img) {
    super(x, y, width, height, "Hero", img);
    this.speed = 8;
    this.cooldown = 0;
    this.life = 3;
  }

  // Move hero left while keeping it inside the canvas
  moveLeft() {
    this.x -= this.speed;
    if (this.x < 0) this.x = 0;
  }

  // Move hero right while keeping it inside the canvas
  moveRight(canvasWidth) {
    this.x += this.speed;
    if (this.x + this.width > canvasWidth) {
      this.x = canvasWidth - this.width;
    }
  }

    // Move hero up while keeping it inside the canvas
  moveUp(minY) {
    this.y -= this.speed;
    if (this.y < minY) {
      this.y = minY;
    }
  }

  // Move hero down while keeping it inside the canvas
  moveDown(maxY) {
    this.y += this.speed;
    if (this.y + this.height > maxY) {
      this.y = maxY - this.height;
    }
  }

  /*
    Attempt to fire a laser.
    Returns true only if the cooldown has expired.
  */
  fire() {
    if (this.cooldown > 0) return false;
    this.cooldown = 20;
    return true;
  }

  // Reduce the firing cooldown each frame
  decrementCooldown() {
    if (this.cooldown > 0) {
      this.cooldown--;
    }
  }
}

/*
  Enemy ship class.
  Right now it does not add new behavior beyond GameObject,
  but keeping it separate makes the design cleaner and expandable.
*/
class Enemy extends GameObject {
  constructor(x, y, width, height, img) {
    super(x, y, width, height, "Enemy", img);
  }
}

/*
  Laser object used for both hero lasers and enemy lasers.
*/
class Laser extends GameObject {
  constructor(x, y, width, height, img, speed, type) {
    super(x, y, width, height, type, img);
    this.speed = speed;
  }

  // Move the laser vertically each frame
  update() {
    this.y += this.speed;
  }
}

/* Global game variables */
let canvas;
let ctx;
let eventEmitter;
let gameObjects = [];
let hero = null;
let heroImg = null;
let enemyImg = null;
let laserImg = null;
let lifeImg = null;
let gameLoopId = null;
let score = 0;
let isGameOver = false;
let pressedKeys = {};
let enemyDirection = 1;
let enemyMoveTimer = 0;
let enemyMoveInterval = 45;
let enemyShootTimer = 0;
let enemyShootInterval = 140; 

/* Object size constants */
const HERO_WIDTH = 60;
const HERO_HEIGHT = 60;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const LASER_WIDTH = 12;
const LASER_HEIGHT = 30;

/*
  Start the game only after the page finishes loading.
  This ensures the canvas exists before JavaScript tries to use it.
*/
window.onload = async function () {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  await loadAssets();
  initGame();
  setupKeyboard();
  startGameLoop();
};

/*
  Load all image assets before starting gameplay.
*/
async function loadAssets() {
  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  lifeImg = await loadTexture("assets/life.png");
}

/*
  Helper function that returns a Promise for image loading.
*/
function loadTexture(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/*
  Reset game state and create a new game.
*/
function initGame() {
  eventEmitter = new EventEmitter();
  gameObjects = [];
  score = 0;
  isGameOver = false;
  pressedKeys = {};
  enemyDirection = 1;
  enemyMoveTimer = 0;
  enemyShootTimer = 0;

  createHero();
  createEnemies();
  registerEventHandlers();
}

/*
  Create the player ship and place it near the bottom center of the canvas.
*/
function createHero() {
  hero = new Hero(
    canvas.width / 2 - HERO_WIDTH / 2,
    canvas.height - 100,
    HERO_WIDTH,
    HERO_HEIGHT,
    heroImg
  );
  gameObjects.push(hero);
}

/*
  Create the enemy formation in rows and columns.
*/
function createEnemies() {
  const rows = 5;
  const cols = 8;
  const startX = 120;
  const startY = 80;
  const gapX = 85;
  const gapY = 65;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const enemy = new Enemy(
        startX + col * gapX,
        startY + row * gapY,
        ENEMY_WIDTH,
        ENEMY_HEIGHT,
        enemyImg
      );
      gameObjects.push(enemy);
    }
  }
}

/*
  Register listeners for game events.
*/
function registerEventHandlers() {
  eventEmitter.on(Messages.KEY_EVENT_DOWN, (key) => {
    pressedKeys[key] = true;
  });

  eventEmitter.on(Messages.KEY_EVENT_UP, (key) => {
    pressedKeys[key] = false;
  });

  /*
    Hero laser hits an enemy:
    - mark both as dead
    - increase score
    - check win condition
  */
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, ({ enemy, laser }) => {
    if (enemy.dead || laser.dead) return;
    enemy.dead = true;
    laser.dead = true;
    score += 100;

    if (isEnemiesDead()) {
      endGame(true);
    }
  });

  /*
    Enemy hits hero, or enemy laser hits hero:
    - remove laser/enemy if present
    - decrease hero life
    - check loss condition
  */
  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, ({ enemy, laser }) => {
    if (laser && !laser.dead) {
      laser.dead = true;
    }
    if (enemy && !enemy.dead) {
      enemy.dead = true;
    }

    hero.life--;

    if (isHeroDead()) {
      endGame(false);
    }
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => {
    isGameOver = true;
  });

  eventEmitter.on(Messages.GAME_END_LOSS, () => {
    isGameOver = true;
  });
}

/*
  Set up keyboard input for movement, shooting, and restart.
*/
function setupKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) {
      e.preventDefault();
    }

    if (isGameOver && e.code === "Enter") {
      restartGame();
      return;
    }
  });
}

/*
  Start the animation loop using requestAnimationFrame.
*/
function startGameLoop() {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }

  function gameLoop() {
    update();
    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
  }

  gameLoop();
}

/*
  Reset and restart the game after win/loss.
*/
function restartGame() {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }
  initGame();
  startGameLoop();
}

/*
  Update all gameplay logic each frame.
*/
function update() {
  if (isGameOver) return;

  updateHero();
  updateLasers();
  updateEnemies();
  detectCollisions();
  removeDeadGameObjects();
}

/*
  Handle hero movement and shooting based on current key state.
*/
function updateHero() {
  if (!hero || hero.dead) return;

  const minY = canvas.height * 0.4;
  const maxY = canvas.height;

  if (pressedKeys["ArrowLeft"]) {
    hero.moveLeft();
  }

  if (pressedKeys["ArrowRight"]) {
    hero.moveRight(canvas.width);
  }

  if (pressedKeys["Space"]) {
    if (hero.fire()) {
      createHeroLaser();
    }
  }

  hero.decrementCooldown();
}

/*
  Create a laser fired by the hero.
*/
function createHeroLaser() {
  const laser = new Laser(
    hero.x + hero.width / 2 - LASER_WIDTH / 2,
    hero.y - LASER_HEIGHT,
    LASER_WIDTH,
    LASER_HEIGHT,
    laserImg,
    -12,
    "HeroLaser"
  );
  gameObjects.push(laser);
}

/*
  Create a laser fired by an enemy.
*/
function createEnemyLaser(enemy) {
  const laser = new Laser(
    enemy.x + enemy.width / 2 - LASER_WIDTH / 2,
    enemy.y + enemy.height,
    LASER_WIDTH,
    LASER_HEIGHT,
    laserImg,
    5,
    "EnemyLaser"
  );
  gameObjects.push(laser);
}

/*
  Update all lasers and remove them if they leave the screen.
*/
function updateLasers() {
  const lasers = gameObjects.filter(
    (go) => go.type === "HeroLaser" || go.type === "EnemyLaser"
  );

  lasers.forEach((laser) => {
    laser.update();

    if (laser.y < -laser.height || laser.y > canvas.height) {
      laser.dead = true;
    }
  });
}

/*
  Move enemies horizontally.
  When they hit an edge:
  - reverse direction
  - move downward
  Also handles periodic enemy shooting.
*/
function updateEnemies() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  if (!enemies.length) return;

  enemyMoveTimer++;
  enemyShootTimer++;

  if (enemyMoveTimer >= enemyMoveInterval) {
    enemyMoveTimer = 0;

    let hitEdge = false;

    enemies.forEach((enemy) => {
      enemy.x += 10 * enemyDirection; // slower horizontal movement
      enemy.y += 3;                   // gradual downward movement every move step

      if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
        hitEdge = true;
      }

      // if an enemy gets below the hero, player loses
      if (hero && enemy.y >= hero.y + hero.height) {
        endGame(false);
      }

      // if enemy reaches/touches hero area, also lose
      if (hero && enemy.y + enemy.height >= hero.y) {
        endGame(false);
      }
    });

    if (hitEdge) {
      enemyDirection *= -1;

      enemies.forEach((enemy) => {
        enemy.y += 10; // a bit of extra drop when bouncing off the wall
      });
    }
  }

  if (enemyShootTimer >= enemyShootInterval) {
    enemyShootTimer = 0;

    const aliveEnemies = enemies.filter((e) => !e.dead);
    if (aliveEnemies.length > 0) {
      const shooter =
        aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      createEnemyLaser(shooter);
    }
  }
}

/*
  Check all possible collisions:
  - hero lasers vs enemies
  - enemy lasers vs hero
  - enemies vs hero
*/
function detectCollisions() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  const heroLasers = gameObjects.filter(
    (go) => go.type === "HeroLaser" && !go.dead
  );
  const enemyLasers = gameObjects.filter(
    (go) => go.type === "EnemyLaser" && !go.dead
  );

  heroLasers.forEach((laser) => {
    enemies.forEach((enemy) => {
      if (intersectRect(laser.rectFromGameObject(), enemy.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { enemy, laser });
      }
    });
  });

  enemyLasers.forEach((laser) => {
    if (
      hero &&
      !hero.dead &&
      intersectRect(laser.rectFromGameObject(), hero.rectFromGameObject())
    ) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: null, laser });
    }
  });

  enemies.forEach((enemy) => {
    if (
      hero &&
      !hero.dead &&
      intersectRect(enemy.rectFromGameObject(), hero.rectFromGameObject())
    ) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy, laser: null });
    }
  });
}

/*
  Axis-aligned rectangle collision detection.
  Returns true if two rectangles overlap.
*/
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

/*
  Remove all objects that were marked dead.
*/
function removeDeadGameObjects() {
  gameObjects = gameObjects.filter((go) => !go.dead);
}

/*
  Returns true if the hero has no life remaining.
*/
function isHeroDead() {
  return hero.life <= 0;
}

/*
  Returns true if all enemies have been destroyed.
*/
function isEnemiesDead() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  return enemies.length === 0;
}

/*
  End the game with either a win or loss state.
*/
function endGame(didWin) {
  if (isGameOver) return;

  isGameOver = true;

  if (didWin) {
    eventEmitter.emit(Messages.GAME_END_WIN);
  } else {
    eventEmitter.emit(Messages.GAME_END_LOSS);
  }
}

/*
  Draw everything for the current frame.
*/
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawGameObjects();
  drawScore();
  drawLife();

  if (isGameOver) {
    drawEndMessage();
  }
}

/*
  Draw a simple black starry background.
*/
function drawBackground() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % canvas.width;
    const y = (i * 61) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }
}

/*
  Draw every active game object.
*/
function drawGameObjects() {
  gameObjects.forEach((go) => go.draw(ctx));
}

/*
  Draw the player score near the bottom-left corner.
*/
function drawScore() {
  ctx.font = "28px Arial";
  ctx.fillStyle = "red";
  ctx.fillText(`Score: ${score}`, 20, canvas.height - 20);
}

/*
  Draw remaining lives using the life icon.
*/
function drawLife() {
  const startPos = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(lifeImg, startPos + i * 45, canvas.height - 45, 30, 30);
  }
}

/*
  Draw the end-game overlay and message.
*/
function drawEndMessage() {
  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.font = "48px Arial";
  ctx.fillStyle = isHeroDead() ? "red" : "lightgreen";
  ctx.fillText(
    isHeroDead() ? "Game Over" : "Victory!",
    canvas.width / 2,
    canvas.height / 2 - 20
  );

  ctx.font = "28px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(
    "Press Enter to restart",
    canvas.width / 2,
    canvas.height / 2 + 40
  );

  ctx.restore();
}