// game.js
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const player = {
  x: canvas.width / 2 - 60,
  y: canvas.height - 160,
  width: 160,
  height: 160,
  bullets: [],
  image: new Image(),
  loaded: false,
  bulletImage: new Image(),
  doubleShot: false,
  shotCount: 1
};

player.image.src = "tekerli-karakter.png";
player.bulletImage.src = "1.png";

player.image.onload = () => {
  player.loaded = true;
  gameLoop();
};

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dx = (Math.random() - 0.5) * 4;
    this.dy = (Math.random() - 0.5) * 4;
    this.alpha = 1;
  }
  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.alpha -= 0.02;
  }
  draw() {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Ball {
  constructor(x, y, radius, health) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.health = health;
    this.dy = -6;
    this.dx = (Math.random() - 0.5) * 2;
    this.gravity = 0.03;
    this.bounce = -1;
    this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    this.isDying = false;
    this.fade = 1;
  }
  drawPolygon(sides) {
    ctx.save();
    ctx.globalAlpha = this.fade;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const px = this.x + Math.cos(angle) * this.radius;
      const py = this.y + Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  draw() {
    this.drawPolygon(6);
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.health, this.x, this.y + 6);
  }
  update() {
    if (this.isDying) {
      this.fade -= 0.05;
      if (this.fade <= 0) return false;
      this.draw();
      return true;
    }
    this.y += this.dy;
    this.x += this.dx;
    this.dy += this.gravity;

    if (this.y + this.radius >= canvas.height - 20) {
      this.y = canvas.height - 20 - this.radius;
      this.dy = -6;
    }
    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
      this.dx *= -1;
    }
    this.draw();
    return true;
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.color = "pink";
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("★", this.x, this.y + 5);
  }
  update() {
    this.y += 1;
    this.draw();
  }
}

const balls = [];
const powerUps = [];
const particles = [];
let ballLevel = 1;
let lives = 3;
let score = 0;
let gameOver = false;

function spawnBalls() {
  const radius = 50;
  const health = 25 + (ballLevel - 1) * 5;
  balls.push(new Ball(Math.random() * (canvas.width - 100) + 50, -radius, radius, health));
  if (Math.random() < 0.3) {
    powerUps.push(new PowerUp(Math.random() * canvas.width, -20));
  }
  ballLevel++;
}

spawnBalls();
setInterval(spawnBalls, 9000);

function drawPlayer() {
  if (player.loaded) {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = "gray";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }
}

function drawBullets() {
  player.bullets.forEach((b, index) => {
    b.y -= 14;
    if (player.bulletImage.complete) {
      ctx.drawImage(player.bulletImage, b.x, b.y, 40, 60);
    } else {
      ctx.fillStyle = "black";
      ctx.fillRect(b.x, b.y, 8, 20);
    }
    if (b.y < 0) player.bullets.splice(index, 1);
  });
}

function detectCollision(ball, bullet) {
  const dist = Math.hypot(ball.x - bullet.x, ball.y - bullet.y);
  return dist < ball.radius;
}

function updateBalls() {
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    if (!ball.update()) {
      balls.splice(i, 1);
      continue;
    }
    if (
      ball.y + ball.radius > player.y &&
      ball.x > player.x &&
      ball.x < player.x + player.width &&
      !ball.isDying
    ) {
      ball.isDying = true;
      lives--;
      if (lives <= 0) gameOver = true;
      continue;
    }
    for (let j = 0; j < player.bullets.length; j++) {
      const bullet = player.bullets[j];
      if (detectCollision(ball, bullet)) {
        ball.health -= 2;
        player.bullets.splice(j, 1);
        for (let p = 0; p < 8; p++) particles.push(new Particle(ball.x, ball.y));
        if (ball.health <= 0 && ball.radius > 30) {
          balls.push(new Ball(ball.x, ball.y, 25, 15));
          balls.push(new Ball(ball.x, ball.y, 25, 15));
          ball.isDying = true;
        } else if (ball.health <= 0 && ball.radius <= 30) {
          ball.isDying = true;
        }
        score += 1;
        break;
      }
    }
  }
}

function updatePowerUps() {
  powerUps.forEach((p, index) => {
    p.update();
    const dist = Math.hypot(player.x + player.width / 2 - p.x, player.y - p.y);
    if (dist < 40) {
      if (player.shotCount < 4) player.shotCount++;
      powerUps.splice(index, 1);
    }
  });
}

function drawParticles() {
  particles.forEach((p, index) => {
    p.update();
    p.draw();
    if (p.alpha <= 0) particles.splice(index, 1);
  });
}

function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Score: " + score, canvas.width - 30, 40);
}

function drawLives() {
  ctx.fillStyle = "#fff8dc";
  ctx.fillRect(10, 10, 200, 70);
  ctx.fillStyle = "#000";
  ctx.font = "bold 18px Arial";
  ctx.fillText("HEALTH", 100, 28);
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(player.bulletImage, 20 + i * 40, 35, 32, 48);
  }
}

function drawLava() {
  ctx.fillStyle = "#f94144";
  ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
}

function drawGameOver() {
  ctx.fillStyle = "red";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("You proved it.", canvas.width / 2, canvas.height / 2);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLava();
  drawPlayer();
  drawBullets();
  updateBalls();
  updatePowerUps();
  drawParticles();
  drawScore();
  drawLives();
  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    drawGameOver();
  }
}

canvas.addEventListener("mousemove", (e) => {
  player.x = e.clientX - player.width / 2;
});

function getFireRate() {
  return Math.max(100, 500 - balls.length * 20);
}

setInterval(() => {
  if (gameOver) return;
  const baseX = player.x + player.width / 2;
  const spacing = 20;
  for (let i = 0; i < player.shotCount; i++) {
    const offset = (i - (player.shotCount - 1) / 2) * spacing;
    player.bullets.push({ x: baseX + offset - 16, y: player.y });
  }
}, getFireRate());

document.addEventListener("keydown", (e) => {
  if ((e.key === "r" || e.key === "R") && gameOver) {
    restartGame();
  }
});

function restartGame() {
  lives = 3;
  score = 0;
  gameOver = false;
  player.bullets = [];
  balls.length = 0;
  powerUps.length = 0;
  particles.length = 0;
  player.doubleShot = false;
  player.shotCount = 1;
  ballLevel = 1;
  spawnBalls();
  gameLoop();
}let musicStarted = false;

function startMusic() {
  if (!musicStarted) {
    const bgm = document.getElementById("bgm");
    if (bgm) {
      bgm.loop = true;
      bgm.volume = 0.5;
      bgm.play()
        .then(() => {
          musicStarted = true;
          console.log("Müzik otomatik başladı.");
        })
        .catch(err => {
          console.warn("Müzik otomatik çalınamadı, kullanıcı etkileşimi bekleniyor:", err);
        });
    }
  }
}

// Oyun başladıktan 5 saniye sonra müzik başlatmayı dene
setTimeout(startMusic, 5000);

// Eğer otomatik başlamazsa, ilk tuş basımında tekrar dene
window.addEventListener("keydown", () => {
  if (!musicStarted) startMusic();
});
