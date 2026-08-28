// Torre de Bloques — adaptado de Tower Blocks para vivir embebido dentro de
// mayITa-survey como minijuego opcional. Se instancia solo al entrar a la
// pantalla #s-tower (initTowerBlocks) y pausa su loop/listeners al salir
// (leaveTowerBlocks), para no interferir con el resto de la app.

// Preguntas de respaldo si /api/preguntas no responde (servidor apagado, etc).
// La primera ya tiene texto, el resto son plantillas para editar despues.
// "correcta" indica si la respuesta correcta a esa pregunta es Si (true) o No (false).
var DEFAULT_QUESTIONS = [
    { texto: '¿Te gusta el helado?', correcta: true },
    { texto: 'Pregunta 2 (edita este texto)', correcta: true },
    { texto: 'Pregunta 3 (edita este texto)', correcta: true },
    { texto: 'Pregunta 4 (edita este texto)', correcta: true },
    { texto: 'Pregunta 5 (edita este texto)', correcta: true },
    { texto: 'Pregunta 6 (edita este texto)', correcta: true },
    { texto: 'Pregunta 7 (edita este texto)', correcta: true },
    { texto: 'Pregunta 8 (edita este texto)', correcta: true }
];

// URL base del backend de Torre de Bloques (Express + MySQL).
// En localhost usa el server corriendo en la máquina; en cualquier otro
// origen (GitHub Pages, etc.) usa el backend desplegado en DigitalOcean.
var TOWER_API_BASE = "https://mayita-api.apps-celaque.net";

function createFacadeCanvas() {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    // window frame
    ctx.fillStyle = '#f4f4f2';
    ctx.fillRect(0, 0, 64, 64);
    // glass pane
    ctx.fillStyle = 'rgba(148, 197, 190, 0.9)';
    ctx.fillRect(6, 8, 52, 42);
    // glass highlight
    var gradient = ctx.createLinearGradient(6, 8, 58, 50);
    gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(6, 8, 52, 42);
    return canvas;
}
var facadeTexture = new THREE.CanvasTexture(createFacadeCanvas());
facadeTexture.wrapS = THREE.RepeatWrapping;
facadeTexture.wrapT = THREE.RepeatWrapping;
function createParkingCanvas() {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#a3a3a3';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#232323';
    var cell = 16;
    for (var y = 0; y < 64; y += cell) {
        for (var x = 0; x < 64; x += cell) {
            if (((x / cell) + (y / cell)) % 2 === 0) {
                ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
            }
        }
    }
    return canvas;
}
var parkingTexture = new THREE.CanvasTexture(createParkingCanvas());
parkingTexture.wrapS = THREE.RepeatWrapping;
parkingTexture.wrapT = THREE.RepeatWrapping;
function createTree(scale) {
    var group = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1, 6), new THREE.MeshToonMaterial({ color: 0x8b5a2b, shading: THREE.FlatShading }));
    trunk.position.y = 0.5;
    group.add(trunk);
    var leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 8), new THREE.MeshToonMaterial({ color: 0x4c9a5b, shading: THREE.FlatShading }));
    leaves.position.y = 1.8;
    group.add(leaves);
    group.scale.set(scale, scale, scale);
    return group;
}
function createBush(scale) {
    var bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshToonMaterial({ color: 0x3f8f52, shading: THREE.FlatShading }));
    bush.position.y = 0.4 * scale;
    bush.scale.set(scale, scale, scale);
    return bush;
}
function createCar(color, rotationY) {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshToonMaterial({ color: color, shading: THREE.FlatShading });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 1), bodyMat);
    body.position.y = 0.45;
    group.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.9), bodyMat);
    cabin.position.set(-0.15, 1, 0);
    group.add(cabin);
    var wheelMat = new THREE.MeshToonMaterial({ color: 0x1c1c1c, shading: THREE.FlatShading });
    [[-0.6, -0.55], [-0.6, 0.55], [0.6, -0.55], [0.6, 0.55]].forEach(function (w) {
        var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 8), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(w[0], 0.22, w[1]);
        group.add(wheel);
    });
    group.rotation.y = rotationY || 0;
    return group;
}
function createLampPost() {
    var group = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), new THREE.MeshToonMaterial({ color: 0x2b2b2e, shading: THREE.FlatShading }));
    pole.position.y = 1.5;
    group.add(pole);
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshToonMaterial({ color: 0xffe8a3, shading: THREE.FlatShading }));
    lamp.position.y = 3.1;
    group.add(lamp);
    return group;
}
function createGroundPlane() {
    var geometry = new THREE.PlaneGeometry(50, 50);
    var material = new THREE.MeshToonMaterial({ color: 0x8fc98a, shading: THREE.FlatShading });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(5, -0.05, 5);
    return mesh;
}
function createRoadCanvas() {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3d3d42';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#f4e9c9';
    ctx.fillRect(20, 14, 40, 4);
    return canvas;
}
var roadTexture = new THREE.CanvasTexture(createRoadCanvas());
roadTexture.wrapS = THREE.RepeatWrapping;
roadTexture.wrapT = THREE.RepeatWrapping;
function createRoad(length, width) {
    var geometry = new THREE.PlaneGeometry(length, width);
    var texture = roadTexture.clone();
    texture.needsUpdate = true;
    texture.repeat.set(length / 6, 1);
    var material = new THREE.MeshToonMaterial({ map: texture, shading: THREE.FlatShading });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}
function createSidewalk(length) {
    return new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 1), new THREE.MeshToonMaterial({ color: 0xcfcfcf, shading: THREE.FlatShading }));
}
function createWater(x, z, width, depth) {
    var geometry = new THREE.PlaneGeometry(width, depth);
    var material = new THREE.MeshToonMaterial({ color: 0x5fb0d9, shading: THREE.FlatShading, transparent: true, opacity: 0.85 });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    return mesh;
}
function createGroundScenery() {
    var group = new THREE.Group();
    group.add(createGroundPlane());
    var road = createRoad(36, 4);
    road.position.set(5, 0.01, -7);
    group.add(road);
    var sidewalkNorth = createSidewalk(36);
    sidewalkNorth.position.set(5, 0.05, -5);
    group.add(sidewalkNorth);
    var sidewalkSouth = createSidewalk(36);
    sidewalkSouth.position.set(5, 0.05, -9);
    group.add(sidewalkSouth);
    [-10, 0, 10, 20].forEach(function (lx) {
        var lamp = createLampPost();
        lamp.position.set(lx, 0, -4.7);
        group.add(lamp);
    });
    var carColors = [0xd94f4f, 0x4f7fd9, 0xe0c23c, 0x8f4fd9];
    var laneZ = [-5.8, -8.2];
    var carX = [-6, 2, 10, 17];
    carX.forEach(function (x, i) {
        var lane = laneZ[i % 2];
        var facing = lane === laneZ[0] ? 0 : Math.PI;
        var car = createCar(carColors[i % carColors.length], facing);
        car.position.set(x, 0, lane);
        group.add(car);
    });
    var treeSpots = [
        [-3, -3], [13, -3], [-3, 13], [13, 13],
        [-4, 4], [14, 6], [-4, 9],
        [-8, -9.5], [1, -9.5], [10, -9.5], [18, -9.5]
    ];
    treeSpots.forEach(function (spot) {
        var tree = createTree(0.7 + Math.random() * 0.3);
        tree.position.set(spot[0], 0, spot[1]);
        group.add(tree);
    });
    var bushSpots = [[-1, 2], [-1, 6], [11, 2], [11, 6], [2, -1], [6, -1], [2, 11], [6, 11]];
    bushSpots.forEach(function (spot) {
        var bush = createBush(0.55 + Math.random() * 0.25);
        bush.position.set(spot[0], 0, spot[1]);
        group.add(bush);
    });
    group.add(createWater(19, 15, 10, 8));
    return group;
}
var Stage = /** @class */ (function () {
    function Stage() {
        // container
        var _this = this;
        this.render = function () {
            this.renderer.render(this.scene, this.camera);
        };
        this.add = function (elem) {
            this.scene.add(elem);
        };
        this.remove = function (elem) {
            this.scene.remove(elem);
        };
        this.container = document.getElementById('game');
        // renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);
        // scene
        this.scene = new THREE.Scene();
        // camera
        var aspect = window.innerWidth / window.innerHeight;
        var d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.x = 2;
        this.camera.position.y = 2;
        this.camera.position.z = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        //light
        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        window.addEventListener('resize', function () { return _this.onResize(); });
        this.onResize();
    }
    Stage.prototype.setCamera = function (y, speed) {
        if (speed === void 0) { speed = 0.3; }
        TweenLite.to(this.camera.position, speed, { y: y + 4, ease: Power1.easeInOut });
        TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    };
    Stage.prototype.onResize = function () {
        var viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    };
    return Stage;
}());
var Block = /** @class */ (function () {
    function Block(block) {
        // set size and position
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 12;
        this.dimension = { width: 0, height: 0, depth: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetBlock = block;
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? 'x' : 'z';
        this.workingDimension = this.index % 2 ? 'width' : 'depth';
        // set the dimensions from the target block, or defaults.
        this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
        this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
        this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;
        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);
        // set color
        var isParking = !!this.targetBlock && this.index <= 3;
        if (!this.targetBlock) {
            this.color = 0x333344;
        }
        else if (isParking) {
            this.color = 0xaaaaaa;
        }
        else {
            var offset = this.index + this.colorOffset;
            var r = Math.sin(0.3 * offset) * 15 + 170;
            var g = Math.sin(0.3 * offset + 2) * 15 + 205;
            var b = Math.sin(0.3 * offset + 4) * 12 + 205;
            this.color = new THREE.Color(r / 255, g / 255, b / 255);
        }
        // state
        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;
        // set direction
        this.speed = -0.1 - (this.index * 0.005);
        if (this.speed < -4)
            this.speed = -4;
        this.direction = this.speed;
        // create block
        var geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        var materialParams = { color: this.color, shading: THREE.FlatShading };
        if (this.targetBlock) {
            var blockTexture = (isParking ? parkingTexture : facadeTexture).clone();
            blockTexture.needsUpdate = true;
            var windowsAcross = Math.max(1, Math.round(Math.max(this.dimension.width, this.dimension.depth) / 3));
            blockTexture.repeat.set(windowsAcross, 1);
            materialParams.map = blockTexture;
        }
        this.material = new THREE.MeshToonMaterial(materialParams);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);
        if (this.state == this.STATES.ACTIVE) {
            this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        }
    }
    Block.prototype.reverseDirection = function () {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    };
    Block.prototype.place = function () {
        this.state = this.STATES.STOPPED;
        var overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
        var blocksToReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };
        if (this.dimension[this.workingDimension] - overlap < 0.3) {
            overlap = this.dimension[this.workingDimension];
            blocksToReturn.bonus = true;
            this.position.x = this.targetBlock.position.x;
            this.position.z = this.targetBlock.position.z;
            this.dimension.width = this.targetBlock.dimension.width;
            this.dimension.depth = this.targetBlock.dimension.depth;
        }
        if (overlap > 0) {
            var choppedDimensions = { width: this.dimension.width, height: this.dimension.height, depth: this.dimension.depth };
            choppedDimensions[this.workingDimension] -= overlap;
            this.dimension[this.workingDimension] = overlap;
            var placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            var placedMesh = new THREE.Mesh(placedGeometry, this.material);
            var choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
            choppedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
            var choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
            var choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
                this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
            }
            else {
                choppedPosition[this.workingPlane] += overlap;
            }
            placedMesh.position.set(this.position.x, this.position.y, this.position.z);
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
            blocksToReturn.placed = placedMesh;
            if (!blocksToReturn.bonus)
                blocksToReturn.chopped = choppedMesh;
        }
        else {
            this.state = this.STATES.MISSED;
        }
        this.dimension[this.workingDimension] = overlap;
        return blocksToReturn;
    };
    Block.prototype.tick = function () {
        if (this.state == this.STATES.ACTIVE) {
            var value = this.position[this.workingPlane];
            if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
                this.reverseDirection();
            this.position[this.workingPlane] += this.direction;
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
        }
    };
    return Block;
}());
var Game = /** @class */ (function () {
    function Game() {
        var _this = this;
        this.STATES = {
            'LOADING': 'loading',
            'PLAYING': 'playing',
            'READY': 'ready',
            'ENDED': 'ended',
            'RESETTING': 'resetting'
        };
        this.blocks = [];
        this.state = this.STATES.LOADING;
        this.stage = new Stage();
        this.mainContainer = document.getElementById('container');
        this.scoreContainer = document.getElementById('score');
        this.startButton = document.getElementById('start-button');
        this.instructions = document.getElementById('instructions');
        this.questionCloud = document.getElementById('question-cloud');
        this.questionText = document.getElementById('question-text');
        this.questionForm = document.getElementById('question-form');
        this.feedbackMessage = document.getElementById('feedback-message');
        this.progressText = document.getElementById('progress-text');
        this.progressFill = document.getElementById('progress-fill');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.summaryList = document.getElementById('summary-list');
        this.departmentSelect = document.getElementById('department-select');
        this.departmentList = document.getElementById('department-list');
        this.questions = DEFAULT_QUESTIONS.map(function (q, i) { return { id: i + 1, texto: q.texto, respuesta_correcta: q.correcta }; });
        this.questionsReady = this.loadQuestions();
        this.departments = [];
        this.departmentsReady = this.loadDepartments();
        this.departamentoId = null;
        this.questionIndex = 0;
        this.incorrectCount = 0;
        this.quizActive = false;
        this.answering = false;
        this.active = false;
        this.scoreContainer.innerHTML = '0';
        this.newBlocks = new THREE.Group();
        this.placedBlocks = new THREE.Group();
        this.choppedBlocks = new THREE.Group();
        this.stage.add(this.newBlocks);
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);
        this.groundScenery = createGroundScenery();
        this.stage.add(this.groundScenery);
        this.addBlock();
        this.updateState(this.STATES.READY);
        document.addEventListener('keydown', function (e) {
            if (!_this.active) return;
            if (e.keyCode == 32)
                _this.onAction();
        });
        document.addEventListener('click', function (e) {
            if (!_this.active) return;
            _this.onAction();
        });
        document.addEventListener('touchstart', function (e) {
            if (!_this.active) return;
            e.preventDefault();
            // this.onAction();
            // ☝️ this triggers after click on android so you
            // insta-lose, will figure it out later.
        });
        document.getElementById('answer-yes').addEventListener('click', function (e) {
            if (!_this.active) return;
            e.stopPropagation();
            _this.answerQuestion(true);
        });
        document.getElementById('answer-no').addEventListener('click', function (e) {
            if (!_this.active) return;
            e.stopPropagation();
            _this.answerQuestion(false);
        });
        var restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', function (e) {
                if (!_this.active) return;
                e.stopPropagation();
                _this.restartGame();
            });
        }
        this.startLoop();
    }
    Game.prototype.updateState = function (newState) {
        for (var key in this.STATES)
            this.mainContainer.classList.remove(this.STATES[key]);
        this.mainContainer.classList.add(newState);
        this.state = newState;
    };
    Game.prototype.onAction = function () {
        if (this.quizActive)
            return;
        switch (this.state) {
            case this.STATES.READY:
                this.startGame();
                break;
            case this.STATES.PLAYING:
                this.placeBlock();
                break;
        }
    };
    Game.prototype.startGame = function () {
        if (this.state != this.STATES.PLAYING) {
            this.scoreContainer.innerHTML = '0';
            this.updateState(this.STATES.PLAYING);
            this.instructions.classList.add('hide');
            this.showDepartmentSelect();
        }
    };
    Game.prototype.loadQuestions = function () {
        var _this = this;
        return fetch(TOWER_API_BASE + '/api/preguntas')
            .then(function (res) {
                if (!res.ok)
                    throw new Error('respuesta no valida');
                return res.json();
            })
            .then(function (data) {
                if (!Array.isArray(data) || data.length === 0)
                    throw new Error('sin preguntas');
                _this.questions = data;
            })
            .catch(function () {
                // sin conexion al servidor: seguimos con las preguntas de respaldo.
                _this.questions = DEFAULT_QUESTIONS.map(function (q, i) { return { id: i + 1, texto: q.texto, respuesta_correcta: q.correcta }; });
            });
    };
    Game.prototype.loadDepartments = function () {
        var _this = this;
        return fetch(TOWER_API_BASE + '/api/departamentos')
            .then(function (res) {
                if (!res.ok)
                    throw new Error('respuesta no valida');
                return res.json();
            })
            .then(function (data) {
                _this.departments = Array.isArray(data) ? data : [];
            })
            .catch(function () {
                // sin conexion al servidor: no se pudo cargar la lista, se omite la seleccion.
                _this.departments = [];
            });
    };
    Game.prototype.showDepartmentSelect = function () {
        var _this = this;
        this.departmentsReady.then(function () {
            if (!_this.departments.length) {
                _this.startQuiz();
                return;
            }
            _this.renderDepartmentList();
            _this.departmentSelect.classList.add('visible');
        });
    };
    Game.prototype.renderDepartmentList = function () {
        var _this = this;
        var list = this.departmentList;
        list.innerHTML = '';
        this.departments.forEach(function (dep) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'department-btn';
            btn.textContent = dep.nombre;
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                _this.selectDepartment(dep.id);
            });
            list.appendChild(btn);
        });
    };
    Game.prototype.selectDepartment = function (id) {
        this.departamentoId = id;
        this.departmentSelect.classList.remove('visible');
        this.startQuiz();
    };
    Game.prototype.logAnswer = function (preguntaId, isYes, nivel) {
        fetch(TOWER_API_BASE + '/api/respuestas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pregunta_id: preguntaId,
                sesion_id: this.sessionId,
                departamento_id: this.departamentoId,
                respuesta: isYes,
                nivel_en_momento: nivel
            })
        }).catch(function () {
            // sin conexion al servidor: el juego sigue igual, solo no queda guardado en la bitacora.
        });
    };
    Game.prototype.startQuiz = function () {
        var _this = this;
        this.sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('sess-' + Date.now() + '-' + Math.random().toString(16).slice(2));
        this.quizActive = true;
        this.answering = false;
        this.questionIndex = 0;
        this.incorrectCount = 0;
        this.questionsReady.then(function () {
            _this.showNextQuestion();
        });
    };
    Game.prototype.showNextQuestion = function () {
        this.questionText.textContent = this.questions[this.questionIndex].texto;
        this.updateProgress();
        this.questionCloud.classList.add('visible');
    };
    Game.prototype.updateProgress = function () {
        var current = this.questionIndex + 1;
        var total = this.questions.length;
        this.progressText.textContent = 'Pregunta ' + current + ' de ' + total;
        this.progressFill.style.width = (current / total * 100) + '%';
    };
    Game.prototype.answerQuestion = function (isYes) {
        if (!this.quizActive || this.answering)
            return;
        this.answering = true;
        var currentQuestion = this.questions[this.questionIndex];
        var isCorrect = isYes === currentQuestion.respuesta_correcta;
        this.questionForm.classList.add('hide');
        this.feedbackMessage.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto';
        this.feedbackMessage.className = isCorrect ? 'visible correct' : 'visible incorrect';
        var _this = this;
        setTimeout(function () {
            _this.applyAnswer(isYes, isCorrect, currentQuestion);
        }, 1100);
    };
    Game.prototype.applyAnswer = function (isYes, isCorrect, currentQuestion) {
        this.questionCloud.classList.remove('visible');
        this.questionForm.classList.remove('hide');
        this.feedbackMessage.className = '';
        this.answering = false;
        if (!isCorrect)
            this.incorrectCount++;
        var lastBlock = this.blocks[this.blocks.length - 1];
        var newBlock = new Block(lastBlock);
        newBlock.state = newBlock.STATES.STOPPED;
        newBlock.position[newBlock.workingPlane] = lastBlock.position[newBlock.workingPlane];
        if (!isCorrect) {
            newBlock.dimension[newBlock.workingDimension] = lastBlock.dimension[newBlock.workingDimension] * 0.75;
        }
        var geometry = new THREE.BoxGeometry(newBlock.dimension.width, newBlock.dimension.height, newBlock.dimension.depth);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(newBlock.dimension.width / 2, newBlock.dimension.height / 2, newBlock.dimension.depth / 2));
        newBlock.mesh.geometry.dispose();
        newBlock.mesh.geometry = geometry;
        newBlock.mesh.position.set(newBlock.position.x, newBlock.position.y, newBlock.position.z);
        newBlock.mesh.scale.set(0.05, 0.05, 0.05);
        TweenLite.to(newBlock.mesh.scale, 0.35, { x: 1, y: 1, z: 1, ease: Back.easeOut.config(1.7) });
        this.placedBlocks.add(newBlock.mesh);
        this.blocks.push(newBlock);
        this.stage.setCamera(this.blocks.length * 2);
        var score = this.blocks.length - 1;
        this.scoreContainer.innerHTML = String(score);
        this.mainContainer.classList.toggle('space', score >= 30);
        this.logAnswer(currentQuestion.id, isYes, score);
        this.questionIndex++;
        if (this.questionIndex >= this.questions.length) {
            this.quizActive = false;
            this.finishQuiz();
        }
        else {
            this.showNextQuestion();
        }
    };
    Game.prototype.finishQuiz = function () {
        var correctCount = this.questions.length - this.incorrectCount;
        var won = correctCount >= 7;
        this.gameOverTitle.textContent = won ? '¡Ganaste!' : 'Perdiste';
        this.gameOverTitle.classList.toggle('won', won);
        this.gameOverTitle.classList.toggle('lost', !won);
        this.gameOverMessage.textContent = 'Acertaste ' + correctCount + ' de ' + this.questions.length + ' preguntas.';
        this.renderSummary();
        this.updateState(this.STATES.ENDED);
        this.lastResult = { won: won, correctCount: correctCount, total: this.questions.length };
    };
    Game.prototype.renderSummary = function () {
        var correctCount = this.questions.length - this.incorrectCount;
        var list = this.summaryList;
        list.innerHTML = '';
        var correctPill = document.createElement('div');
        correctPill.className = 'summary-pill correct';
        correctPill.textContent = '✓ ' + correctCount + ' correctas';
        var incorrectPill = document.createElement('div');
        incorrectPill.className = 'summary-pill incorrect';
        incorrectPill.textContent = '✗ ' + this.incorrectCount + ' incorrectas';
        list.appendChild(correctPill);
        list.appendChild(incorrectPill);
    };
    Game.prototype.restartGame = function () {
        var _this = this;
        this.updateState(this.STATES.RESETTING);
        var oldBlocks = this.placedBlocks.children;
        var removeSpeed = 0.2;
        var delayAmount = 0.02;
        var _loop_1 = function (i) {
            TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn, onComplete: function () { return _this.placedBlocks.remove(oldBlocks[i]); } });
            TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn });
        };
        for (var i = 0; i < oldBlocks.length; i++) {
            _loop_1(i);
        }
        var cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
        this.stage.setCamera(2, cameraMoveSpeed);
        var countdown = { value: this.blocks.length - 1 };
        TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: function () { _this.scoreContainer.innerHTML = String(Math.round(countdown.value)); } });
        this.blocks = this.blocks.slice(0, 1);
        setTimeout(function () {
            _this.startGame();
        }, cameraMoveSpeed * 1000);
    };
    Game.prototype.placeBlock = function () {
        var _this = this;
        var currentBlock = this.blocks[this.blocks.length - 1];
        var newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);
        if (newBlocks.placed)
            this.placedBlocks.add(newBlocks.placed);
        if (newBlocks.chopped) {
            this.choppedBlocks.add(newBlocks.chopped);
            var positionParams = { y: '-=30', ease: Power1.easeIn, onComplete: function () { return _this.choppedBlocks.remove(newBlocks.chopped); } };
            var rotateRandomness = 10;
            var rotationParams = {
                delay: 0.05,
                x: newBlocks.plane == 'z' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                z: newBlocks.plane == 'x' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                y: Math.random() * 0.1
            };
            if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
                positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
            }
            else {
                positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
            }
            TweenLite.to(newBlocks.chopped.position, 1, positionParams);
            TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
        }
        this.addBlock();
    };
    Game.prototype.addBlock = function () {
        var lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
            return this.endGame();
        }
        var score = this.blocks.length - 1;
        this.scoreContainer.innerHTML = String(score);
        this.mainContainer.classList.toggle('space', score >= 30);
        var newKidOnTheBlock = new Block(lastBlock);
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        this.stage.setCamera(this.blocks.length * 2);
        if (this.blocks.length >= 5)
            this.instructions.classList.add('hide');
    };
    Game.prototype.endGame = function () {
        this.updateState(this.STATES.ENDED);
        this.lastResult = { won: false, correctCount: this.questions.length - this.incorrectCount, total: this.questions.length };
    };
    Game.prototype.resetToReady = function () {
        var _this = this;
        this.placedBlocks.children.slice().forEach(function (m) { _this.placedBlocks.remove(m); });
        this.newBlocks.children.slice().forEach(function (m) { _this.newBlocks.remove(m); });
        this.choppedBlocks.children.slice().forEach(function (m) { _this.choppedBlocks.remove(m); });
        this.blocks = [];
        this.quizActive = false;
        this.answering = false;
        this.questionIndex = 0;
        this.incorrectCount = 0;
        this.departamentoId = null;
        this.mainContainer.classList.remove('space');
        this.scoreContainer.innerHTML = '0';
        this.instructions.classList.remove('hide');
        this.stage.setCamera(2, 0.01);
        this.addBlock();
        this.updateState(this.STATES.READY);
    };
    Game.prototype.startLoop = function () {
        var _this = this;
        this.active = true;
        var loop = function () {
            if (!_this.active) return;
            _this.blocks[_this.blocks.length - 1].tick();
            _this.stage.render();
            _this.rafId = requestAnimationFrame(loop);
        };
        loop();
    };
    Game.prototype.stopLoop = function () {
        this.active = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
    };
    return Game;
}());

var towerGame = null;

function initTowerBlocks() {
    if (!towerGame) {
        towerGame = new Game();
    } else {
        towerGame.startLoop();
    }
}

function leaveTowerBlocks() {
    if (towerGame) towerGame.stopLoop();
}
