// Constantes de configuração do jogo
const GAME_WIDTH = 288;
const GAME_HEIGHT = 512;
const SPEED = -150;
const SPAWN_TIME = 1500;

// Variáveis globais
let game;
let isGameOver = false;
let score = 0;
let scoreText;
let isRefresh = false;
let hitPlayed = false;
let diePlayed = false;
let character;
let base;
let baseHeight;
let baseWidth;
let gameStart = false;

// Configuração do Phaser
let config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 600 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

// Inicia o jogo
game = new Phaser.Game(config);

// Função de preload para carregar todos os recursos
function preload() {
  this.load.image("background", "assets/GameObjects/background-day.png");
  this.load.image("character1", "assets/GameObjects/yellowbird-midflap.png");
  this.load.image("character2", "assets/GameObjects/yellowbird-downflap.png");
  this.load.image("character3", "assets/GameObjects/yellowbird-upflap.png");
  this.load.image("character4", "assets/GameObjects/yellowbird-fall.png");
  this.load.image("pillar", "assets/GameObjects/pipe-green.png");
  this.load.image("base", "assets/GameObjects/base.png");
  this.load.image("gameover", "assets/UI/gameover.png");
  this.load.image("score", "assets/UI/score.png");
  this.load.image("retry", "assets/UI/retry.png");
  this.load.image("startGame", "assets/UI/message.png");
  this.load.audio("score", "assets/SoundEffects/point.wav");
  this.load.audio("hit", "assets/SoundEffects/hit.wav");
  this.load.audio("wing", "assets/SoundEffects/wing.wav");
  this.load.audio("die", "assets/SoundEffects/die.wav");
}

// Função de criação do jogo
function create() {
  let background = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "background");
  background.setOrigin(0, 0);
  background.displayWidth = this.sys.game.config.width;
  background.displayHeight = this.sys.game.config.height;

  // Base do jogo
  let baseImage = this.textures.get("base");
  baseHeight = baseImage.getSourceImage().height;
  baseWidth = baseImage.getSourceImage().width;
  base = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - baseHeight / 2, baseWidth, baseHeight, "base");
  this.physics.add.existing(base, true);
  base.setDepth(1);

  // Imagem de início do jogo
  let startGameImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 3, "startGame");
  startGameImage.setOrigin(0.5, 0.5);

  // Personagem
  character = this.physics.add.sprite(GAME_WIDTH / 4, GAME_HEIGHT / 2, "character1");
  character.setDepth(1);
  character.setCollideWorldBounds(true);
  character.body.allowGravity = false;
  gameStart = false;

  // Animações do personagem
  this.anims.create({
    key: "fly",
    frames: [
      { key: "character1" },
      { key: "character2" },
      { key: "character3" },
    ],
    frameRate: 9,
    repeat: -1,
  });
  this.anims.create({
    key: "fall",
    frames: [{ key: "character4" }],
    frameRate: 9,
    repeat: -1,
  });
  character.anims.play("fly", true);

  // Iniciar o jogo ao clicar
  this.input.on("pointerdown", function (pointer) {
    if (gameStart) return;
    gameStart = true;
    startGameImage.setVisible(false);
    character.body.allowGravity = true;

    // Criar grupos de pilares
    this.upperPillars = this.physics.add.group();
    this.lowerPillars = this.physics.add.group();
    this.spawnPillarPair();

    // Colisões
    this.physics.add.collider(character, this.upperPillars, hitPillar, null, this);
    this.physics.add.collider(character, this.lowerPillars, hitPillar, null, this);
    this.physics.add.collider(character, base, hitBase, null, this);

    // Exibir o placar
    scoreText = this.add.text(GAME_WIDTH / 2, 30, "0", {
      fontSize: "32px",
      fontFamily: "Fantasy",
      fill: "white",
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(1);

    // Sons
    point = this.sound.add("score");
    hit = this.sound.add("hit");
    wing = this.sound.add("wing");
    die = this.sound.add("die");

    // Movimento do personagem
    this.input.on("pointerdown", function (pointer) {
      if (!isRefresh && !isGameOver) {
        wing.play();
        character.setVelocityY(-230);
      }
      isRefresh = false;
    }, this);
  }, this);
}

// Função de atualização do jogo
function update() {
  if (!isGameOver) base.tilePositionX += 1;
  if (!gameStart) return;

  let scoreIncremented = false;
  [this.upperPillars, this.lowerPillars].forEach((group) => {
    group.children.iterate((pillar) => {
      if (!pillar) return;

      // Aumentar o placar quando os pilares passam
      if (!pillar.hasPassed && pillar.x + pillar.width < character.x) {
        pillar.hasPassed = true;
        if (!scoreIncremented) {
          score++;
          scoreText.setText(score);
          point.play();
          scoreIncremented = true;
        }
      }
      if (pillar.x + pillar.width < 0) {
        pillar.destroy();
      }
    });
  });
  if (this.pillarSpawnTime < this.time.now && !isGameOver) {
    this.spawnPillarPair();
  }
}

// Função para gerar pares de pilares
Phaser.Scene.prototype.spawnPillarPair = function () {
  let baseImage = this.textures.get("base");
  let baseHeight = baseImage.getSourceImage().height;
  let pillarImage = this.textures.get("pillar");
  let pillarHeight = pillarImage.getSourceImage().height;

  let offset = (Math.random() * pillarHeight) / 2;
  let k = Math.floor(Math.random() * 3) - 1;
  offset = offset * k;

  let gapHeight = (1 / 3) * (GAME_HEIGHT - baseHeight);
  let lowerY = 2 * gapHeight + pillarHeight / 2 + offset;
  let upperY = gapHeight - pillarHeight / 2 + offset;

  let upperPillar = this.upperPillars.create(GAME_WIDTH, upperY, "pillar");
  upperPillar.setAngle(180);

  let lowerPillar = this.lowerPillars.create(GAME_WIDTH, lowerY, "pillar");
  upperPillar.body.allowGravity = false;
  lowerPillar.body.allowGravity = false;

  upperPillar.setVelocityX(SPEED);
  lowerPillar.setVelocityX(SPEED);
  this.pillarSpawnTime = this.time.now + SPAWN_TIME;
};

// Função quando o personagem atinge a base
function hitBase(character, base) {
  if (!hitPlayed) hit.play();
  character.anims.play("fall", true);
  base.body.enable = false;
  character.setVelocityX(0);
  character.setVelocityY(0);
  character.body.allowGravity = false;
  [this.upperPillars, this.lowerPillars].forEach(group => group.children.iterate(pillar => pillar.body.velocity.x = 0));
  isGameOver = true;

  // Exibir a tela de Game Over
  let gameOverImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 4, "gameover");
  gameOverImage.setOrigin(0.5, 0.5);

  let scoreImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT, "score");
  scoreImage.setOrigin(0.5, 0.5);

  finalScoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT, score, { fontSize: "32px", fontFamily: "Fantasy", fill: "white" });
  finalScoreText.setOrigin(0.5, 0.5);

  this.tweens.add({
    targets: [scoreImage, finalScoreText],
    y: function (target) {
      return target === scoreImage ? GAME_HEIGHT / 2.2 : GAME_HEIGHT / 2.1;
    },
    ease: "Power1",
    duration: 500,
    repeat: 0,
    yoyo: false,
  });

  scoreText.destroy();
  let retryImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 1.5, "retry");
  retryImage.setOrigin(0.5, 0.5);
  retryImage.setScale(0.25);
  retryImage.setInteractive();
  retryImage.on("pointerdown", function (pointer) {
    isGameOver = false;
    score = 0;
    gameStart = false;
    this.scene.restart();
    hitPlayed = false;
    diePlayed = false;
    isRefresh = true;
  }, this);
}

// Função quando o personagem atinge um pilar
function hitPillar(character, pillar) {
  if (!hitPlayed && !diePlayed) {
    hit.play();
    die.play();
    hitPlayed = true;
    diePlayed = true;
  }
  character.anims.play("fall", true);
  pillar.body.enable = false;
  character.setVelocityX(0);
  [this.upperPillars, this.lowerPillars].forEach(group => group.children.iterate(pillar => pillar.body.velocity.x = 0));
  isGameOver = true;
}
