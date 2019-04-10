/// <reference path="../_references.ts" />
class Game {
    constructor() {
        this._selected = [];
        this._colliding = [];
        this._dead = [];
        Game._player = new Player("Goat");
        this._tileMap = new TileMap(30, 15);
        this._entities = [
            Game._player
        ];
        this._tileMap.insertEntities(this._entities);
        this._currentLevel = -1;
    }
    //Only adding one entity to colliding, TODO
    checkCollisions(entity) {
        // let tiles: Tile[] = this._tileMap.getEntityTiles(entity);
        let tiles = this._tileMap.getTiles([entity.head]);
        let colliding = [];
        for (let tile of tiles) {
            for (let otherEntity of tile.entities) {
                if (!colliding.includes(otherEntity) && entity !== otherEntity) { //&& otherEntity.constructor.name !== "Ground") {
                    colliding.push(otherEntity);
                    otherEntity.playerCollision();
                }
            }
        }
        this._colliding = colliding;
    }
    get colliding() {
        return this._colliding;
    }
    get entities() {
        return this._entities;
    }
    set entities(entities) {
        this._entities = entities;
    }
    get battle() {
        return this._battle;
    }
    set battle(battle) {
        this._battle = battle;
    }
    get dead() {
        return this._dead;
    }
    set dead(dead) {
        this._dead = dead;
    }
    get tileMap() {
        return this._tileMap;
    }
    set tileMap(tileMap) {
        this._tileMap = tileMap;
    }
    nextLevel() {
        let next;
        try {
            next = levels[this._currentLevel + 1];
        }
        catch (e) {
            console.log(e);
            return false;
        }
        this.changeLevel(next);
        this._currentLevel += 1;
        return true;
    }
    changeLevel(level) {
        let old = this._tileMap;
        let newMap = level.call(this);
        this._tileMap = newMap;
        Game.player.hunger = 1;
        main.draw();
        // if (level == levels[0]) {
        main.resize();
        // }
        return old;
    }
    static get player() {
        return Game._player;
    }
    static set player(player) {
        Game._player = player;
    }
    get selected() {
        return this._selected;
    }
    set selected(tiles) {
        this._selected = tiles;
    }
    updatePlayerMana(tiles) {
        for (let tile of tiles) {
            let vowels = tile.getVowels();
            for (let vowel of vowels) {
                Game.player.mana.increase(vowel, 1);
            }
        }
        //temporary hacky solution: removes the e and o added from "HERO". TODO
        Game.player.mana.decrease("a", 1);
        Game.player.mana.decrease("o", 1);
        // console.log(Game.player.mana.toString());
    }
    moveSnake(entity, dir) {
        if (dir == [0, 0] || !dir) {
            return null;
        }
        entity.oldDirs.unshift(dir);
        if (entity.oldDirs.length > entity.location.length) {
            entity.oldDirs.pop();
        }
        let oldLocation = entity.location;
        let oldHead = entity.head;
        let newLocation = [];
        let newHead = [(oldHead[0] - dir[0]), (oldHead[1] - dir[1])];
        if (this.tileMap.getTile(newHead[0], newHead[1]) != null
            && this.tileMap.getTile(newHead[0], newHead[1]).containsEntity(entity)) {
            return oldLocation;
        }
        newLocation.push(newHead);
        oldLocation = oldLocation.slice(0, -1);
        newLocation = newLocation.concat(oldLocation);
        return newLocation;
    }
    undoSnake(entity) {
        let oldLocation = entity.location;
        let oldBottom = oldLocation[oldLocation.length - 1];
        let newLocation = [];
        let dir = entity.oldDirs[entity.oldDirs.length - 1];
        let newBottom = [(oldBottom[0] + dir[0]), (oldBottom[1] + dir[1])];
        if (this.tileMap.getTile(newBottom[0], newBottom[1]) != null
            && this.tileMap.getTile(newBottom[0], newBottom[1]).containsEntity(entity)) {
            return oldLocation;
        }
        newLocation.push(newBottom);
        oldLocation = oldLocation.slice(1, 0);
        newLocation = oldLocation.concat(newLocation);
        return newLocation;
    }
    move(entity, newLocation) {
        //check length of intended location
        if (entity.name.length != newLocation.length) {
            return false;
        }
        if (newLocation.includes(null)) {
            return false;
        }
        //check if location contains at least one instance of entity
        let i;
        for (i = newLocation.length - 1; i >= 0; i--) {
            if (newLocation[i].entities.includes(entity)) {
                break;
            }
        }
        if (i == -1) {
            return false;
        }
        //check if selected is in a line
        // let xdiff: number = Math.abs(this._tileMap.getTileLocation(newLocation[0])[0] - this._tileMap.getTileLocation(newLocation[newLocation.length - 1])[0]);
        // let ydiff: number = Math.abs(this._tileMap.getTileLocation(newLocation[0])[1] - this._tileMap.getTileLocation(newLocation[newLocation.length - 1])[1]);
        // if ((ydiff != 3 && ydiff != 0) || (xdiff != 3 && xdiff != 0)) {
        // 	return false;
        // }
        //if all conditions were met, move to new location
        let oldLocation = this._tileMap.getEntityTiles(entity);
        for (let i = 0; i < newLocation.length; i++) {
            let index = oldLocation[i].entityIndex(entity);
            oldLocation[i].removeEntity(entity);
            oldLocation[i].removeLetterAtIndex(index);
            newLocation[i].addEntity(entity);
            newLocation[i].addLetter(entity.name.charAt(i));
        }
        let curLocation = [];
        for (let i = 0; i < newLocation.length; i++) {
            curLocation.push(this._tileMap.getTileLocation(newLocation[i]));
        }
        entity.location = curLocation;
        this._selected = [];
        if (entity == Game._player) {
            this.updatePlayerMana(newLocation);
        }
        return true;
    }
    headshift(entity, mul) {
        let newHead = entity.head;
        newHead[0] += mul * entity.dir[0];
        newHead[1] += mul * entity.dir[1];
        let line = this._tileMap.getTiles(this._tileMap.line(newHead, entity.dir, entity.length));
        if (line.indexOf(null) == -1 && this.move(entity, line)) {
            entity.head = newHead;
            return true;
        }
        else {
            return false;
        }
    }
    // changeDir(entity: Entity, dir: number[]): boolean {
    // 	let line = this._tileMap.getTiles(this._tileMap.line(entity.head, dir, entity.length));
    // 	if (line.indexOf(null) == -1 && this.move(entity, line)) {
    // 		entity.dir = dir;
    // 		return true;
    // 	} else {
    // 		return false;
    // 	}
    // }
    rotateDir(entity, clockwise) {
        let newDir = this._tileMap.rotateDir(entity.dir, clockwise);
        entity.dir = newDir;
        // return this.changeDir(entity, newdir);
        return true;
    }
    toJSON() {
        const proto = Object.getPrototypeOf(this);
        const jsonObj = Object.assign({}, this);
        Object.entries(Object.getOwnPropertyDescriptors(proto))
            .filter(([key, descriptor]) => typeof descriptor.get === 'function')
            .map(([key, descriptor]) => {
            if (descriptor && key[0] !== '_') {
                try {
                    const val = this[key];
                    jsonObj[key] = val;
                }
                catch (error) {
                    console.error(`Error calling getter ${key}`, error);
                }
            }
        });
        return jsonObj;
    }
}
/// <reference path="../_references.ts" />
class Tile {
    constructor() {
        this._entities = [];
        this._letters = [];
    }
    get letters() {
        return this._letters;
    }
    set letters(letters) {
        this._letters = letters;
    }
    addLetter(letter) {
        this._letters.push(letter);
    }
    removeLetter(letter) {
        let index = this._letters.indexOf(letter);
        this._letters.splice(index, 1);
    }
    removeLetterAtIndex(index) {
        this._letters.splice(index, 1);
    }
    removeTopLetter() {
        this._letters.pop();
    }
    changeLetter(index, newLetter) {
        this._letters[index] = newLetter;
    }
    getTopLetter() {
        return this._letters[this._letters.length - 1];
    }
    get entities() {
        return this._entities;
    }
    set entities(entities) {
        this._entities = entities;
    }
    addEntity(entity) {
        this._entities.push(entity);
    }
    containsEntity(entity) {
        return this._entities.indexOf(entity) != -1;
    }
    removeEntity(entity) {
        for (let i = 0; i < this._entities.length; i++) {
            if (this._entities[i] == entity) {
                this._entities.splice(i, 1);
            }
        }
    }
    entityIndex(entity) {
        return this._entities.indexOf(entity);
    }
    getVowels() {
        let vowels = [];
        for (let letter of this._letters) {
            if ("aieou".includes(letter.toLowerCase())) {
                vowels.push(letter);
            }
        }
        return vowels;
    }
}
/// <reference path="../_references.ts" />
class TileMap {
    constructor(width, height) {
        this._width = width;
        this._height = height;
        this._entities = [];
        this._tiles = new Array(this._width);
        for (let x = 0; x < this._width; x++) {
            this._tiles[x] = new Array(this._height);
            for (let y = 0; y < this._height; y++) {
                let entity = new Ground();
                entity.location.push([x, y]);
                this._tiles[x][y] = new Tile();
                this._tiles[x][y].addLetter(entity.name);
                this._tiles[x][y].addEntity(entity);
                this._entities.push(entity);
            }
        }
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get tiles() {
        return this._tiles;
    }
    get entities() {
        return this._entities;
    }
    randomPosDir() {
        let x = Math.floor(Math.random() * this._width), y = Math.floor(Math.random() * this._height);
        let directions = [-1, 0, 1];
        let xStep = directions[Math.floor((Math.random() * 3))];
        if (xStep == 0) {
            directions = [-1, 1];
        }
        let yStep = directions[Math.floor((Math.random() * directions.length))];
        return [x, y, xStep, yStep];
    }
    rotateDir(dir, clockwise) {
        let cos45 = 0.70710678118;
        let sin45 = 0.70710678118;
        let x = dir[0];
        let y = dir[1];
        if (clockwise) {
            return [Math.round(x * cos45 + y * sin45), Math.round(y * cos45 - x * sin45)];
        }
        else {
            return [Math.round(x * cos45 - y * sin45), Math.round(x * sin45 + y * cos45)];
        }
    }
    insertEntities(entities) {
        for (let i = 0; i < entities.length; i++) {
            this.insertEntity(entities[i]);
        }
    }
    line(head, dir, length) {
        let locations = [];
        let x = head[0];
        let y = head[1];
        for (let i = 0; i < length; i++) {
            locations.push([x, y]);
            x += dir[0];
            y += dir[1];
        }
        return locations;
    }
    insertEntityAt(entity, x, y, xStep, yStep) {
        let path = [];
        let i;
        //Does entity name fit?
        for (i = 0; i < entity.name.length; i++) {
            if (x < this.width && x > 0 && y < this.height && y > 0) {
                let tile = this._tiles[x][y];
                if (tile.entities.length == 1 ||
                    tile.getTopLetter() == entity.name.charAt(i)) {
                    tile.addLetter(entity.name.charAt(i));
                    path.push([x, y]);
                    x += xStep;
                    y += yStep;
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
        }
        //If so, add entity to tile.
        if (i == entity.name.length) {
            let currLocation = [];
            for (let location of path) {
                currLocation.push(location);
                let x = location[0];
                let y = location[1];
                this._tiles[x][y].addEntity(entity);
            }
            entity.location = currLocation;
            this._entities.push(entity);
            return true;
        }
        else {
            for (let location of path) {
                let x = location[0];
                let y = location[1];
                this._tiles[x][y].removeTopLetter();
            }
            return this.insertEntity(entity);
        }
    }
    insertEntity(entity) {
        let posDir = this.randomPosDir();
        let x = posDir[0], y = posDir[1], xStep = posDir[2], yStep = posDir[3];
        let path = [];
        let i;
        //Does entity name fit?
        for (i = 0; i < entity.name.length; i++) {
            if (x < this.width && x > 0 && y < this.height && y > 0) {
                let tile = this._tiles[x][y];
                if (tile.entities.length == 1 ||
                    tile.getTopLetter() == entity.name.charAt(i)) {
                    tile.addLetter(entity.name.charAt(i));
                    path.push([x, y]);
                    x += xStep;
                    y += yStep;
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
        }
        //If so, add entity to tile.
        if (i == entity.name.length) {
            let currLocation = [];
            for (let location of path) {
                currLocation.push(location);
                let x = location[0];
                let y = location[1];
                this._tiles[x][y].addEntity(entity);
            }
            entity.location = currLocation;
            this._entities.push(entity);
            return true;
        }
        else {
            for (let location of path) {
                let x = location[0];
                let y = location[1];
                this._tiles[x][y].removeTopLetter();
            }
            return this.insertEntity(entity);
        }
    }
    removeEntity(entity) {
        //TODO
        let tiles = this.getEntityTiles(entity);
        if (tiles.length <= 0) {
            throw ("Entity not found.");
        }
        for (let tile of tiles) {
            tile.removeEntity(entity);
            tile.removeTopLetter();
        }
        game.dead.push(entity);
        return entity;
    }
    getTileLocation(tile) {
        for (let x = 0; x < this._width; x++) {
            for (let y = 0; y < this._height; y++) {
                if (this._tiles[x][y] == tile) {
                    return [x, y];
                }
            }
        }
    }
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            // console.log("out of bounds....");
            return null;
        }
        return this._tiles[x][y];
    }
    getTiles(points) {
        let result = [];
        for (let i = 0; i < points.length; i++) {
            result.push(this.getTile(points[i][0], points[i][1]));
        }
        return result;
    }
    getEntityTiles(entity) {
        let entityTiles = new Array();
        for (let x = 0; x < this._width; x++) {
            for (let y = 0; y < this._height; y++) {
                let curr = this.getTile(x, y);
                if (curr.containsEntity(entity)) {
                    entityTiles.push(curr);
                }
            }
        }
        return entityTiles;
    }
}
/// <reference path="../_references.ts" />
class Entity {
    constructor(name) {
        this._name = name;
        this._location = [];
        this._active = false;
        this._oldDirs = [];
    }
    //override this default method method
    playerCollision() {
        // let that = this;
        // window.setTimeout(function() {
        // game.tileMap.removeEntity(that);
        // }, 1000);
    }
    get name() {
        return this._name;
    }
    set name(name) {
        this._name = name;
    }
    get length() {
        return this._name.length;
    }
    get location() {
        return this._location;
    }
    set location(location) {
        this._location = location;
        if (location.length < 2) {
            return;
        }
        this._head = location[0];
        this._dir = [location[1][0] - this._head[0], location[1][1] - this._head[1]];
    }
    locationIncludes(x, y) {
        for (let i = 0; i < this._location.length; i++) {
            if (this._location[i][0] == x && this._location[i][1] == y) {
                return true;
            }
        }
        return false;
    }
    get head() {
        return this._head;
    }
    set head(head) {
        this._head = head;
    }
    get tail() {
        return [this._head[0] + this.length * this._dir[0], this._head[1] + this.length * this._dir[1]];
    }
    get dir() {
        return this._dir;
    }
    set dir(dir) {
        this._dir = dir;
    }
    get oldDirs() {
        return this._oldDirs;
    }
    set oldDirs(oldDirs) {
        this._oldDirs = oldDirs;
    }
    get reverseDir() {
        return [this._dir[0] * -1, this._dir[1] * -1];
    }
    get active() {
        return this._active;
    }
    set active(active) {
        this._active = active;
    }
}
/// <reference path="../_references.ts" />
class Ground extends Entity {
    constructor() {
        let randomLetter = Ground.alphabet[Math.floor(Math.random() * Ground.alphabet.length)];
        super(randomLetter);
    }
    playerCollision() {
        if (this.name != " ") {
            Game.player.hunger -= 1;
            let tile = game.tileMap.tiles[this.location[0][0]][this.location[0][1]];
            let oldName = this.name;
            this.name = " ";
            tile.changeLetter(tile.letters.length - 2, this.name);
        }
        // this.interval = setInterval(this.revert.bind(this, tile, oldName), 10000);
    }
    revert(tile, oldName) {
        this.name = oldName;
        tile.changeLetter(tile.letters.length - 1, this.name);
        clearInterval(this.interval);
    }
}
//private static readonly alphabet: string[] = "abcdefghijklmnopqrstuvwxyz".split('');
Ground.alphabet = "bcdfghjklmnpqrstvwxyz".split('');
/// <reference path="../_references.ts" />
class Character extends Entity {
    constructor(name) {
        super(name);
        this._inventory = [];
    }
    attack(enemy) {
        enemy._health -= this._attackDamage;
    }
    addItem(item) {
        this._inventory.push(item);
    }
    removeItem(item) {
        let index = this._inventory.indexOf(item);
        this._inventory.splice(index, 1);
    }
    //TODO
    die() {
        // if (!this.isDead) {
        // 	if(game.tileMap.removeEntity(this)) {
        // 		this.isDead = true;
        // 		game.deadEntities.push(this);
        // 		return true;
        // 	}
        // }
        for (let item of this._inventory) {
            game.colliding.push(item);
        }
        return false;
    }
    playerCollision() {
        // while (this.isAlive() && Game.player.isAlive()) {
        // 	Game.player.attack(this);
        // 	this.attack(Game.player);
        // 	console.log("enemy battled");
        // }
        // if (Game.player.isDead()) {
        // 	Game.player.die();
        // }
        if (!Battle.active) {
            // let b = new Battle(this._health, this._name, 3);
            let b = new Battle(this, 3);
            game.battle = b;
            Battle.active = true;
        }
        super.playerCollision();
    }
    isDead() {
        return !(this._health > 0);
    }
    isAlive() {
        return (this._health > 0);
    }
    get inventory() {
        return this._inventory;
    }
    giveItem(item) {
        this._inventory.push(item);
    }
    get health() {
        return this._health;
    }
    set health(health) {
        this._health = health;
    }
    get attackDamage() {
        return this._attackDamage;
    }
    set attackDamage(attackDamage) {
        this._attackDamage;
    }
    inventoryToString() {
        let s = "Inventory: ";
        if (this._inventory.length > 0) {
            s += this._inventory[0].name;
            for (let i = 1; i < this._inventory.length; i++) {
                s += ", " + this._inventory[i].name;
            }
        }
        return s;
    }
}
/// <reference path="../_references.ts" />
class Player extends Character {
    constructor(name) {
        super(name);
        super._health = 10;
        super._attackDamage = 1;
        super._active = true;
        this._party = [];
        this._mana = new Manager();
        this._skills = [skills.slap, skills.aegis];
        this._hunger = 2;
        this._maxHunger = 10;
    }
    get mana() {
        return this._mana;
    }
    get hunger() {
        return this._hunger;
    }
    set hunger(hunger) {
        this._hunger = hunger;
    }
    get maxHunger() {
        return this._maxHunger;
    }
    set maxHunger(maxHunger) {
        this._maxHunger = maxHunger;
    }
    get skills() {
        return this._skills;
    }
    giveSkill(s) {
        if (this._skills.indexOf(s) == -1) {
            this._skills.push(s);
        }
    }
    revokeSkill(n) {
        let s = skills[n];
        let index = this._skills.indexOf(s);
        if (index != -1) {
            this._skills.splice(index, 1);
        }
    }
    playerCollision() { }
}
/// <reference path="../_references.ts" />
class Manager {
    constructor(word = "") {
        this._a = 0;
        this._e = 0;
        this._i = 0;
        this._o = 0;
        this._u = 0;
        word = word.toLowerCase();
        for (let i = 0; i < word.length; i++) {
            let char = word.charAt(i);
            if (Manager.vowels.indexOf(char) != -1) {
                this.increase(char, 1);
            }
        }
    }
    get a() {
        return this._a;
    }
    set a(x) {
        this._a = x;
    }
    get e() {
        return this._e;
    }
    set e(x) {
        this._e = x;
    }
    get i() {
        return this._i;
    }
    set i(x) {
        this._i = x;
    }
    get o() {
        return this._o;
    }
    set o(x) {
        this._o = x;
    }
    get u() {
        return this._u;
    }
    set u(x) {
        this._u = x;
    }
    getAmount(which) {
        switch (which.toLowerCase()) {
            case "a":
                return this._a;
            case "e":
                return this._e;
            case "i":
                return this._i;
            case "o":
                return this._o;
            case "u":
                return this._u;
        }
    }
    setAmount(which, x) {
        switch (which.toLowerCase()) {
            case "a":
                this._a = x;
                break;
            case "e":
                this._e = x;
                break;
            case "i":
                this._i = x;
                break;
            case "o":
                this._o = x;
                break;
            case "u":
                this._u = x;
                break;
        }
    }
    increase(which, x) {
        switch (which.toLowerCase()) {
            case "a":
                this._a += x;
                break;
            case "e":
                this._e += x;
                break;
            case "i":
                this._i += x;
                break;
            case "o":
                this._o += x;
                break;
            case "u":
                this._u += x;
                break;
        }
    }
    decrease(which, x) {
        switch (which.toLowerCase()) {
            case "a":
                this._a -= x;
                break;
            case "e":
                this._e -= x;
                break;
            case "i":
                this._i -= x;
                break;
            case "o":
                this._o -= x;
                break;
            case "u":
                this._u -= x;
                break;
        }
    }
    add(other) {
        for (let letter in Manager.vowels) {
            this.increase(letter, other.getAmount(letter));
        }
    }
    subtract(other) {
        for (let letter in Manager.vowels) {
            this.decrease(letter, other.getAmount(letter));
        }
    }
    multiply(scalar) {
        scalar = Math.round(scalar);
        for (let letter in Manager.vowels) {
            this.setAmount(letter, this.getAmount(letter) * scalar);
        }
    }
    fitsInto(other) {
        for (let letter in Manager.vowels) {
            if (this.getAmount(letter) > other.getAmount(letter)) {
                return false;
            }
        }
        return true;
    }
    toString() {
        return "Mana Runes (A: " + this._a + ", " + "E: " + this._e + ", " + "I: " + this._i + ", " + "O: " + this._o + ", " + "U: " + this._u + ")";
    }
}
Manager.vowels = ["a", "e", "i", "o", "u"];
/// <reference path="../_references.ts" />
let enemies = {
    Dinosaur: class extends Character {
        constructor() {
            super("Dinosaur");
            super._health = 6;
            super._attackDamage = 2;
        }
    },
    Ghoul: class extends Character {
        constructor() {
            super("Ghoul");
            super._health = 6;
            super._attackDamage = 2;
        }
    },
    Goblin: class extends Character {
        constructor() {
            super("Goblin");
            super._health = 6;
            super._attackDamage = 2;
        }
    },
    Rat: class extends Character {
        constructor() {
            super("Rat");
            super._health = 2;
            super._attackDamage = 2;
        }
    },
    Robot: class extends Character {
        constructor() {
            super("Robot");
            super._health = 1;
            super._attackDamage = 2;
        }
    },
    Unicorn: class extends Character {
        constructor() {
            super("Unicorn");
            super._health = 6;
            super._attackDamage = 2;
        }
    },
    Wizard: class extends Character {
        constructor() {
            super("Wizard");
            super._health = 6;
            super._attackDamage = 2;
        }
    },
    Zombie: class extends Character {
        constructor() {
            super("Zombie");
            super._health = 6;
            super._attackDamage = 2;
        }
    }
};
/// <reference path="../_references.ts" />
class Skill {
    constructor(name, desc, effect) {
        this._name = name;
        this._desc = desc;
        this._effect = effect;
        this._cost = new Manager(name);
    }
    get name() {
        return this._name;
    }
    get desc() {
        return this._name;
    }
    get cost() {
        return this._cost;
    }
    execute(b) {
        this._effect.call(undefined, b);
    }
    static makeDamageEffect(damageAmount) {
        return function (b) {
            b.damage(damageAmount);
        };
    }
    static makeCountdownEffect(countdownAmount) {
        return function (b) {
            b.changeCountdown(countdownAmount);
        };
    }
    static makeStatusEffect(status) {
        return function (b) {
            b.addStatus(status);
        };
    }
    static makeRepeatedEffect(effect, repetitions) {
        return function (b) {
            for (let i = 0; i < repetitions; i++) {
                effect.call(undefined, b);
            }
        };
    }
    static concatEffect(...effects) {
        return function (b) {
            for (let i = 0; i < effects.length; i++) {
                effects[i].call(undefined, b);
            }
        };
    }
    static revokeSkill(skillName) {
        return function (b) {
            b.player.revokeSkill(skillName);
        };
    }
}
Skill.vowels = ["a", "e", "i", "o", "u"];
/// <reference path="../_references.ts" />
class StatusEffect {
    constructor(n, d, c, k) {
        this._name = n;
        this._desc = d;
        this._countdown = c;
        this._kind = k;
        this._turnEndCallback = this.trivialFunction();
        this._attackCallback = this.trivialFunction();
    }
    get countdown() {
        return this._countdown;
    }
    get kind() {
        return this._kind;
    }
    get name() {
        return this._name;
    }
    get desc() {
        let temp = this._desc;
        temp = temp.replace("%countdown", this._countdown + "");
        return temp;
    }
    set turnEndCallback(f) {
        this._turnEndCallback = f;
    }
    set attackCallback(f) {
        this._attackCallback = f;
    }
    increment(x = 1) {
        this._countdown += x;
    }
    decrement(x = 1) {
        this._countdown -= x;
    }
    attack(b) {
        this._attackCallback.call(this, b);
    }
    turnEnd(b) {
        this._turnEndCallback.call(this, b);
    }
    trivialFunction() {
        return function () { };
    }
    static fragileStatus(countdown) {
        let status = new StatusEffect("Fragile", "Enemy takes %countdown extra damage from all attacks.", countdown, "fragile");
        status.attackCallback = function (b) {
            b.damage(this._countdown);
        };
        return status;
    }
    static poisonStatus(countdown) {
        let status = new StatusEffect("Poison", "Enemy takes %countdown damage this turn, then loses 1 Poison.", countdown, "poison");
        status.turnEndCallback = function (b) {
            b.damage(this._countdown);
            this._countdown--;
        };
        return status;
    }
    static regenStatus(countdown) {
        let status = new StatusEffect("Regen", "Enemy heals %countdown HP this turn, then loses 1 Regen.", countdown, "regen");
        status.turnEndCallback = function (b) {
            b.heal(this._countdown);
            this._countdown--;
        };
        return status;
    }
}
/// <reference path="../_references.ts" />
class UsableOnceSkill extends Skill {
    constructor(name, desc, effect) {
        super(name, desc, effect);
    }
    execute(b) {
        super.execute(b);
        b.player.revokeSkill(this.name.toLowerCase());
    }
}
/// <reference path="../_references.ts" />
let skills = {
    slap: new Skill("Slap", "Deal 1 damage.", Skill.makeDamageEffect(1)),
    disemvowel: new Skill("Disemvowel", "Deal 999 damage! (Useable only once.)", Skill.makeDamageEffect(999)),
    aegis: new UsableOnceSkill("Aegis of Divine Unmaking", //someone please give this a better name
    "Increase countdown by 5! (Usable once only.)", Skill.makeCountdownEffect(5)),
    acidify: new Skill("Acidify", "Inflict 1 Fragile.", Skill.makeStatusEffect(StatusEffect.fragileStatus(1))),
    venom: new Skill("Venom", "Inflict 2 poison.", Skill.makeStatusEffect(StatusEffect.poisonStatus(2))),
    fanTheHammer: new Skill("Fan the Hammer", "Do 1 damage 6 times.", Skill.makeRepeatedEffect(Skill.makeDamageEffect(1), 6)),
    poisonPen: new UsableOnceSkill("Poison Pen Diatribe", "Inflict 100 Poison. Usable once only.", Skill.makeStatusEffect(StatusEffect.poisonStatus(100))),
    demolitionCharge: new UsableOnceSkill("Demolition Charge", "Inflict 25 Fragile. Usable once only.", Skill.makeStatusEffect(StatusEffect.fragileStatus(25))),
};
// var skills = {};
// function addSkill(s: Skill): void {
// 	skills[s.name.toLowerCase()] = s;
// }
// function addSkills(...s: Skill[]): void {
// 	for (let i = 0; i < s.length; i++) {
// 		addSkill(s[i]);
// 	}
// }
// addSkills(
// 	new Skill(
// 		"Bash",
// 		"Deal 2 damage.",
// 		Skill.makeDamageEffect(2)
// 	),
// 	new UsableOnceSkill(
// 		"Disemvoweling Scourge",
// 		"Deal 999 damage. Usable once only.",
// 		Skill.makeDamageEffect(999)
// 	),
// 	new UsableOnceSkill(
// 		"Aegis of Divine Unmaking", //someone please give this a better name
// 		"Increase countdown by 5. Usable once only.",
// 		Skill.makeCountdownEffect(5)
// 	),
// );
/// <reference path="../_references.ts" />
class Item extends Entity {
    constructor(name) {
        super(name);
    }
    playerCollision() {
        if (!Game.player.inventory.includes(this)) {
            Game.player.addItem(this);
            console.log(this.name + " added to inventory!");
        }
        super.playerCollision();
    }
}
/// <reference path="../_references.ts" />
class Door extends Entity {
    constructor() {
        super("Door");
    }
    playerCollision() {
        for (let item of Game.player.inventory) {
            if (item.name == "Key") {
                Game.player.removeItem(item);
                game.nextLevel();
                super.playerCollision();
            }
        }
    }
}
/// <reference path="../_references.ts" />
let items = {
    Key: class extends Item {
        constructor() {
            super("Key");
        }
    }
};
/// <reference path="../_references.ts" />
let levels = [
    function () {
        let newMap = new TileMap(15, 15);
        Game.player.addItem(new items.Key);
        let door = new Door();
        door.name = "Start";
        game.entities = [
            Game.player,
            new Sign("Rune"),
            new Sign("Search"),
            door
        ];
        // newMap.insertEntities(game.entities);
        newMap.insertEntityAt(game.entities[1], 5, 5, 0, 1);
        newMap.insertEntityAt(game.entities[2], 4, 8, 1, 0);
        newMap.insertEntityAt(game.entities[3], 6, 12, 1, 0);
        newMap.insertEntityAt(game.entities[0], 10, 1, 1, 0);
        main.showEntities(true);
        return newMap;
    },
    function () {
        let newMap = new TileMap(30, 10);
        let rat_key = new enemies.Rat;
        rat_key.giveItem(new items.Key);
        game.entities = [
            Game.player,
            new enemies.Rat,
            rat_key,
            new items.Key,
            new Door()
        ];
        newMap.insertEntities(game.entities);
        main.changeMusic("Exploratory_Final.mp3");
        main.showEntities(false);
        return newMap;
    },
    function () {
        let newMap = new TileMap(30, 15);
        game.entities = [
            Game.player,
            new enemies.Wizard,
            new enemies.Goblin,
            new enemies.Goblin,
            new enemies.Goblin,
            new enemies.Rat,
            new enemies.Rat,
            new items.Key,
            new Door()
        ];
        newMap.insertEntities(game.entities);
        return newMap;
    },
    function () {
        let newMap = new TileMap(30, 15);
        game.entities = [
            Game.player,
            new enemies.Rat,
            new enemies.Rat,
            new enemies.Robot,
            new enemies.Robot,
            new enemies.Robot,
            new enemies.Robot,
            new enemies.Robot,
            new items.Key,
            new Door()
        ];
        newMap.insertEntities(game.entities);
        main.changeMusic("Modern_Living.mp3");
        return newMap;
    },
    function () {
        let newMap = new TileMap(10, 10);
        Game.player.addItem(new items.Key);
        game.entities = [
            Game.player,
            new Shopkeep(),
            new Door(),
        ];
        newMap.insertEntities(game.entities);
        return newMap;
    },
    function () {
        let newMap = new TileMap(20, 20);
        game.entities = [
            Game.player,
            new enemies.Rat,
            new enemies.Rat,
            new enemies.Zombie,
            new enemies.Zombie,
            new enemies.Ghoul,
            new enemies.Ghoul,
            new items.Key,
            new Door()
        ];
        newMap.insertEntities(game.entities);
        main.changeMusic("Undeadication.mp3");
        return newMap;
    },
    function () {
        let newMap = new TileMap(30, 15);
        game.entities = [
            Game.player,
            new enemies.Rat,
            new enemies.Rat,
            new enemies.Dinosaur,
            new enemies.Dinosaur,
            new enemies.Dinosaur,
            new enemies.Wizard,
            new items.Key,
            new Door()
        ];
        newMap.insertEntities(game.entities);
        main.changeMusic("Bookends.mp3");
        return newMap;
    },
    function () {
        let newMap = new TileMap(30, 15);
        game.entities = [
            Game.player,
            new Sign("Will"),
            new Sign("May"),
            new Sign("Rebekah"),
            new Sign("Helena"),
            new Sign("Jack"),
            new Sign("VGDev")
        ];
        newMap.insertEntities(game.entities);
        main.changeMusic("Victory.mp3");
        main.showEntities(true);
        return newMap;
    }
];
/// <reference path="./controller/Game.ts" />
/// <reference path="./controller/Tile.ts" />
/// <reference path="./controller/TileMap.ts" />
/// <reference path="./controller/Battle.ts" />
/// <reference path="./model/Entity.ts" />
/// <reference path="./model/Ground.ts" />
/// <reference path="./model/Character.ts" />
/// <reference path="./model/Player.ts" />
/// <reference path="./model/Manager.ts" />
/// <reference path="./model/enemies.ts" />
/// <reference path="./model/Skill.ts" />
/// <reference path="./model/StatusEffect.ts" />
/// <reference path="./model/UsableOnceSkill.ts" />
/// <reference path="./model/skills.ts" />
/// <reference path="./model/Item.ts" />
/// <reference path="./model/Door.ts" />
/// <reference path="./model/items.ts" />
/// <reference path="./controller/levels.ts" />
/// <reference path="../_references.ts" />
class Battle {
    // constructor(health: number, enemyName: string, countdown: number) {
    // 	this._startingHealth = health;
    // 	this._health = health;
    // 	this._enemyName = enemyName;
    // 	this._countdown = countdown;
    // 	this._skillQueue = new Array<Skill>();
    // 	this._player = Game.player;
    // 	this._log = new Array<string>();
    // 	this._statuses = [];
    // }
    constructor(enemy, countdown) {
        this._enemy = enemy;
        this._startingHealth = this._enemy.health;
        this._countdown = countdown;
        this._skillQueue = new Array();
        this._player = Game.player;
        this._log = new Array();
        this._statuses = [];
    }
    get countdown() {
        return this._countdown;
    }
    get skillQueue() {
        return this._skillQueue;
    }
    get enemyName() {
        return this._enemy.name;
    }
    get log() {
        return this._log;
    }
    get totalCost() {
        let result = new Manager();
        for (let i = 0; i < this._skillQueue.length; i++) {
            result.add(this._skillQueue[i].cost);
        }
        return result;
    }
    get player() {
        return this._player;
    }
    get statuses() {
        return this._statuses;
    }
    static get active() {
        return Battle._active;
    }
    static set active(active) {
        Battle._active = active;
    }
    addStatus(status) {
        for (let i = 0; i < this._statuses.length; i++) {
            if (this._statuses[i].kind == status.kind) {
                this._statuses[i].increment(status.countdown);
                return;
            }
        }
        this._statuses.push(status);
    }
    changeCountdown(x) {
        this._countdown += x;
    }
    enqueue(s) {
        if (s != null) {
            this._skillQueue.push(s);
        }
    }
    logText(s) {
        this._log.push(s);
    }
    clearQueue() {
        this._skillQueue = new Array();
    }
    endTurn() {
        for (let i = 0; i < this._skillQueue.length; i++) {
            this._skillQueue[i].execute(this);
        }
        this._player.mana.subtract(this.totalCost);
        this._skillQueue = [];
        this.runStatusCallbacks("turnEnd");
        if (this._enemy.health <= 0) {
            this.victory();
            return;
        }
        this._countdown--;
        if (this._countdown == 0) {
            this.gameover();
        }
    }
    damage(x) {
        this._enemy.health -= x;
        this.runStatusCallbacks("attack");
    }
    heal(x) {
        this._enemy.health += x;
        if (this._enemy.health > this._startingHealth) {
            this._enemy.health = this._startingHealth;
        }
    }
    spoils() {
        let result = new Manager(this._enemy.name);
        let ratio = Math.abs(this._enemy.health) / this._startingHealth;
        ratio = Math.max(1, Math.floor(ratio));
        result.multiply(ratio);
        return result;
    }
    victory() {
        //TODO: more victory code goes here
        this._player.mana.add(this.spoils());
        collisionMenu.closeMenu();
        console.log("battle won!");
    }
    gameover() {
        //TODO: game over code goes here
        console.log("battle lost :(");
    }
    runStatusCallbacks(callback) {
        for (let i = 0; i < this._statuses.length; i++) {
            this._statuses[i][callback](this);
        }
        let temp = [];
        for (let i = 0; i < this._statuses.length; i++) {
            if (this._statuses[i].countdown != 0) {
                temp.push(this._statuses[i]);
            }
        }
        this._statuses = temp;
    }
}
//creates a string ascii hp bar
class HpBar {
    constructor(max) {
        this.maxBar = 5; //max number of bars to represent hp in string
        this.currentHealth = max; //hp is full when bar is created
        this.maxHealth = max;
        // this.barString = "██████████";
        this.barString = "<3 <3 <3 <3 <3 ";
    }
    //update will update the currentHealth and reupdate the barString
    //update will take in cur which is the new current hp hpBar should be updated
    //with
    update(cur) {
        if (cur != this.currentHealth) {
            this.currentHealth = cur;
            var tmp = this.currentHealth * 10 / this.maxHealth;
            var i = 0;
            this.barString = "";
            //remaking barString
            // let left = true;
            while (i < this.maxBar) {
                if (i < tmp) {
                    var re = /░/;
                    // if (left) {
                    // this.barString = this.barString + "█";
                    this.barString = this.barString + "<3 ";
                    // } else {
                    // this.barString = this.barString + "]";
                    // }
                    // left = !left;
                }
                else {
                    // this.barString = this.barString + "░";
                    this.barString = this.barString + "   ";
                }
                i = i + 1;
            }
        }
    }
    get bar() {
        return this.barString;
    }
}
/// <reference path="../_references.ts" />
class Shopkeep extends Entity {
    constructor() {
        super("Shopkeep");
    }
    playerCollision() {
        // for (let item of Game.player.inventory) {
        // 	if (item.name == "Key") {
        // 		Game.player.removeItem(item);
        // 		game.nextLevel();
        // 		super.playerCollision();
        // 	}
        // }
        super.playerCollision();
    }
}
/// <reference path="../_references.ts" />
class Sign extends Entity {
    constructor(name) {
        super(name);
    }
    playerCollision() {
        return;
    }
}
class CollisionMenu {
    constructor() {
        this.element = document.getElementById("collision-menu");
        this.colliding = game.colliding.filter(entity => entity.constructor.name !== "Ground");
        this.visible = false;
        this.hpBar = null;
        this.activeSkill = 0;
        this.entity = this.colliding[this.colliding.length - 1];
    }
    //TODO: only showing the top entity of the last tile, pls fix
    getData() {
        let data;
        if (this.colliding.length > 0) {
            let name = this.colliding[this.colliding.length - 1].constructor.name.toLowerCase();
            if (name == "sign") {
                name = this.colliding[this.colliding.length - 1].name.toLowerCase();
            }
            data = xml.getChild(name);
            if (!data) {
                data = xml.getChild("default");
            }
            return data;
        }
        return null;
    }
    setArt(data) {
        let artContainer = document.getElementById("collision-art");
        if (data !== null) {
            let art = data.getChild("art").DOM.textContent;
            artContainer.innerHTML = "<pre>" + art + "</pre>";
        }
        else {
            artContainer.innerHTML = "";
        }
    }
    setName(data) {
        let nameContainer = document.getElementById("collision-name");
        if (data !== null) {
            let entity = this.colliding[this.colliding.length - 1];
            nameContainer.innerHTML = "<p>" + entity.name + "</p>";
        }
        else {
            nameContainer.innerHTML = "";
        }
    }
    setMoves() {
        let skills = Game.player.skills;
        let skillList = document.getElementById("move-list").children[0];
        let children = skillList.childNodes;
        while (children[1]) {
            skillList.removeChild(children[1]);
        }
        for (let i = 0; i < skills.length; i++) {
            let li = document.createElement('li');
            li.appendChild(document.createTextNode(skills[i].name));
            li.classList.add("skill");
            if (i == this.activeSkill) {
                li.classList.add("active");
            }
            console.log(this.activeSkill);
            skillList.appendChild(li);
            if (i != skills.length - 1) {
                li = document.createElement('li');
                li.appendChild(document.createTextNode(" / "));
                li.classList.add("skill-buffer");
                skillList.appendChild(li);
            }
        }
        if (skills.length == 0) {
            let li = document.createElement('li');
            li.appendChild(document.createTextNode("Empty :("));
            skillList.appendChild(li);
        }
    }
    getActiveSkill() {
        return Game.player.skills[this.activeSkill];
    }
    setHealth() {
        let entity = this.colliding[this.colliding.length - 1];
        if (this.hpBar == null) {
            this.hpBar = new HpBar(entity.health);
        }
        this.hpBar.update(entity.health);
        document.getElementById("battle-health-bar").innerHTML = this.hpBar.bar;
    }
    setBattle() {
        if (Battle.active) {
            this.setMoves();
            let turns = document.getElementById("turn-count");
            turns.innerHTML = game.battle.countdown;
            this.setHealth();
        }
    }
    display(data) {
        let ws = document.getElementById("word-search");
        if ((data != null) && showCM) {
            this.setArt(data);
            this.setName(data);
            let battle = document.getElementById("battle");
            if (this.colliding[this.colliding.length - 1] instanceof Character) {
                battle.style.display = "block";
                this.setBattle();
            }
            else {
                battle.style.display = "none";
            }
            this.element.style.display = "inline";
            let that = this;
            window.setTimeout(that.zoomIn, 100);
            this.visible = true;
        }
        else {
            this.zoomOut();
        }
    }
    closeMenu() {
        let entity = this.colliding[this.colliding.length - 1];
        if (entity instanceof Character) {
            // if (entity.isDead()) {
            entity.die();
            game.tileMap.removeEntity(entity);
            // }
        }
        else if (entity instanceof Item) {
            game.tileMap.removeEntity(entity);
        }
        main.draw();
        this.visible = false;
        this.hpBar = null;
        this.activeSkill = 0;
    }
    zoomIn() {
        let cm = document.getElementById("collision-menu");
        if (!cm.classList.contains("zoom")) {
            cm.classList.add("zoom");
        }
        let elements = document.getElementsByClassName("blurrable");
        for (let i = 0; i < elements.length; i++) {
            // let ws = document.getElementById("word-search");
            if (!elements[i].classList.contains("blur")) {
                elements[i].classList.add("blur");
            }
        }
        // let ws = document.getElementById("word-search");
        // if (!ws.classList.contains("blur")) {
        // 	ws.classList.add("blur");
        // }
    }
    zoomOut() {
        let n = 0;
        let cm = document.getElementById("collision-menu");
        if (cm.classList.contains("zoom")) {
            cm.classList.remove("zoom");
            n += 1;
        }
        // let ws = document.getElementById("word-search");
        // if (ws.classList.contains("blur")) {
        // 	ws.classList.remove("blur");
        // 	n += 1;
        // }
        let elements = document.getElementsByClassName("blurrable");
        for (let i = 0; i < elements.length; i++) {
            // let ws = document.getElementById("word-search");
            if (elements[i].classList.contains("blur")) {
                elements[i].classList.remove("blur");
            }
            if (i == elements.length) {
                n += 1;
            }
        }
        if (n == 2) {
            document.addEventListener("transitionend", function hide(event) {
                if (event.propertyName == "opacity"
                    && (cm.style.opacity == 0)
                    && cm.style.display != "none") {
                    cm.style.display = "none";
                }
                console.log(event);
                document.removeEventListener("transitionend", hide);
            });
        }
    }
    //pulling from xml over and over is bad for performance, TODO
    update() {
        this.colliding = game.colliding.filter(entity => entity.constructor.name !== "Ground");
        this.entity = this.colliding[this.colliding.length - 1];
        let data = this.getData();
        this.display(data);
    }
}
class PlayerMenu {
    constructor() {
        this.element = document.getElementById("player-menu");
        this.update();
        this.dialogueKey = "instructions";
        this.dialogueIndex = 0;
        this.completedActions = new Set();
    }
    getData() {
        let data;
        let name = Game.player.name.toLowerCase();
        data = xml.getChild(name);
        if (!data) {
            data = xml.getChild("default");
        }
        return data;
    }
    setArt(data) {
        let artContainer = document.getElementById("player-art");
        let art = data.getChild("art").DOM.textContent;
        artContainer.innerHTML = "<pre>" + art + "</pre>";
    }
    setInfo() {
        this.setMana();
        this.setInventory();
        this.setHunger();
        this.setDialogue();
    }
    setHunger() {
        let hunger = Game.player.hunger;
        if (hunger > Game.player.maxHunger) {
            hunger = Game.player.maxHunger;
        }
        document.getElementById("player-hunger").innerHTML = "Hunger: " + hunger + "/" + Game.player.maxHunger;
    }
    setDialogue() {
        let dialogueMenu = document.getElementById("player-speech-container");
        if (this.dialogueKey == "") {
            dialogueMenu.style.display = "none";
        }
        else {
            if (dialogueMenu.style.display == "none") {
                dialogueMenu.style.display = "inline";
            }
            let k = this.dialogueKey;
            let dialogueList = dialogueXML.getChild(k).getChildren();
            if (this.dialogueIndex >= dialogueList.length) {
                let actionKey = this.dialogueKey + "-f";
                this.dialogueActions(actionKey);
                this.dialogueKey = "";
                this.dialogueIndex = 0;
            }
            else {
                let actionKey = this.dialogueKey + "-d" + (this.dialogueIndex + 1);
                console.log(actionKey);
                this.dialogueActions(actionKey);
                let i = this.dialogueIndex;
                document.getElementById("player-speech").innerHTML = dialogueList[i].DOM.textContent;
            }
        }
    }
    dialogueActions(key) {
        if (this.completedActions.has(key)) {
            return;
        }
        this.completedActions.add(key);
        switch (key) {
            case "instructions-f":
                // try {
                // 	clearInterval(walker);
                // } catch {
                walker = setInterval(main.walk, 1500);
                // }
                break;
            default:
                return;
        }
    }
    setMana() {
        let mana = Game.player.mana;
        document.getElementById("a-mana").innerHTML = mana.a;
        document.getElementById("e-mana").innerHTML = mana.e;
        document.getElementById("i-mana").innerHTML = mana.i;
        document.getElementById("o-mana").innerHTML = mana.o;
        document.getElementById("u-mana").innerHTML = mana.u;
    }
    setInventory() {
        let inventory = Game.player.inventory;
        let inventoryList = document.getElementById("player-inventory-list");
        let children = inventoryList.childNodes;
        while (children[1]) {
            inventoryList.removeChild(children[1]);
        }
        for (let item of inventory) {
            let li = document.createElement('li');
            li.appendChild(document.createTextNode(item.name));
            inventoryList.appendChild(li);
        }
        if (inventory.length == 0) {
            let li = document.createElement('li');
            li.appendChild(document.createTextNode("Empty :("));
            inventoryList.appendChild(li);
        }
    }
    update() {
        let data = this.getData();
        if (data != null) {
            this.setArt(data);
            this.setInfo(data);
        }
    }
}
/// <reference path="../_references.ts" />
let game;
let xml;
let dialogueXML;
let playerMenu;
let collisionMenu;
let music;
let showCM;
let walker;
let seed = function (sketch) {
    let font;
    let fontSize;
    let padding;
    let marginY, marginX;
    let COLORS;
    let showEntities;
    let showMana;
    let locationTest;
    let paused;
    // Runs first.
    sketch.preload = function () {
        customFont = sketch.loadFont("./assets/fonts/fsex300-webfont.ttf");
        xml = sketch.loadXML('./assets/game-entities.xml');
        dialogueXML = sketch.loadXML('./assets/game-dialogue.xml');
        music = sketch.createAudio('./assets/music/Rune_Search.mp3');
        game = new Game();
        playerMenu = new PlayerMenu();
        collisionMenu = new CollisionMenu();
    };
    // Runs once after preload().
    sketch.setup = function () {
        music.loop();
        // playerMenu = new PlayerMenu();
        // collisionMenu = new CollisionMenu();
        let canvas = sketch.createCanvas(1000, 1000);
        sketch.noLoop();
        canvas.parent('word-search');
        marginY = 10;
        marginX = 10;
        fontSize = window.getComputedStyle(document.body).fontSize;
        padding = parseInt(fontSize) * 2;
        showEntities = false;
        showMana = false;
        showCM = true;
        locationTest = false;
        pausec = false;
        COLORS = {
            // player: sketch.color(0, 0, 0),
            player: sketch.color(255, 255, 255),
            selected: sketch.color(160, 160, 160),
            active: sketch.color(120, 0, 120),
            empty: sketch.color(255, 255, 255),
        };
        sketch.resize();
        sketch.translate(100, 100);
        // walker = setInterval(sketch.walk, 500);
        game.nextLevel();
    };
    //main loop of the application
    sketch.draw = function () {
        sketch.clear();
        game.checkCollisions(Game.player);
        for (let x = 0; x < game.tileMap.width; x++) {
            for (let y = 0; y < game.tileMap.height; y++) {
                let tile = game.tileMap.tiles[x][y];
                sketch.displayTile(tile, x, y);
            }
        }
        collisionMenu.update();
        playerMenu.update();
        sketch.updateWordBank();
        // sketch.scrollStyle();
    };
    sketch.pause = function () {
        let game = document.getElementById("game");
        let pauseMenu = document.getElementById("pause");
        if (!paused) {
            clearInterval(walker);
            music.pause();
            game.classList.add("blur");
            pauseMenu.style.display = "flex";
            paused = true;
        }
        else {
            pauseMenu.style.display = "none";
            music.loop();
            game.classList.remove("blur");
            walker = setInterval(sketch.walk, 1500);
            paused = false;
        }
    };
    sketch.changeMusic = function (fileName) {
        fileName = 'assets/music/' + fileName;
        music.pause();
        music = sketch.createAudio(fileName);
        music.loop();
    };
    sketch.updateWordBank = function () {
        let wb = document.getElementById("word-bank");
        let children = wb.childNodes;
        while (children[1]) {
            wb.removeChild(children[1]);
        }
        for (let entity of game.entities) {
            let li = document.createElement('li');
            li.classList.add("word-bank-item");
            if (game.dead.includes(entity)) {
                li.style.setProperty("text-decoration", "line-through");
                li.style.setProperty("font-style", "italic");
            }
            li.appendChild(document.createTextNode(entity.name));
            wb.appendChild(li);
        }
    };
    // Displays the rectangle and text of a Tile.
    sketch.displayTile = function (tile, x, y) {
        let offset = sketch.offsetMap(x, y);
        let xOff = offset[0];
        let yOff = offset[1];
        sketch.setRectStyle(tile);
        sketch.rect(marginX + x * padding + xOff, marginY + y * padding + yOff, padding, padding, 5); //5 is the roundess/radius of the corners
        sketch.setTextStyle(tile);
        sketch.text(tile.getTopLetter().toUpperCase(), marginX + x * padding + xOff, marginY + y * padding + yOff - 2);
    };
    sketch.offsetMap = function (x, y) {
        let theta = (sketch.frameCount + x + y) / 10;
        let coord = [Math.cos(theta) * 5, Math.sin(theta) * 5];
        // return coord; //uncomment to animate
        return [0, 0];
    };
    sketch.walk = function () {
        // game.headshift(Game.player, -1);
        if (collisionMenu.colliding.length > 0) {
            return;
        }
        else {
            let newLocation = game.moveSnake(Game.player, Game.player.dir);
            let tiles = game.tileMap.getTiles(newLocation);
            game.move(Game.player, tiles);
            Game.player.hunger += 1;
            sketch.draw();
        }
    };
    sketch.setTextStyle = function (tile) {
        sketch.noStroke();
        sketch.textSize(parseInt(fontSize) * 1.2);
        sketch.textFont(customFont);
        // sketch.textFont("Courier");
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        if (tile.getTopLetter() == null) {
            tile.addLetter(" ");
        }
        if (tile.entities.includes(Game.player)) {
            // sketch.fill(255);
            sketch.fill(0);
            sketch.textStyle(sketch.BOLD);
        }
        else {
            // sketch.fill(0);
            sketch.fill(255);
            sketch.textStyle(sketch.NORMAL);
        }
    };
    sketch.setRectStyle = function (tile) {
        sketch.rectMode(sketch.CENTER);
        if (showEntities) {
            sketch.showAllEntities(tile);
        }
        if (game.selected.includes(tile)) {
            sketch.fill(COLORS.selected);
        }
        else if (tile.entities.includes(Game.player)) {
            sketch.fill(COLORS.player);
            if (locationTest) {
                let loc = game.tileMap.getTileLocation(tile);
                if (Game.player.locationIncludes(loc[0], loc[1])) {
                    sketch.stroke(sketch.color(0, 255, 255));
                }
            }
        }
        else {
            sketch.noFill();
        }
    };
    sketch.showColliding = function (tile) {
        for (let entity of tile.entities) {
            if (game.colliding.includes(entity)) {
                sketch.textStyle(sketch.BOLD);
                return;
            }
        }
        sketch.textStyle(sketch.NORMAL);
    };
    sketch.showEntities = function (bool) {
        let b = new Boolean(bool);
        showEntities = b;
    };
    sketch.showAllEntities = function (tile) {
        if (tile.entities.length > 1) {
            // sketch.textStyle(sketch.BOLD);
            sketch.stroke(255);
        }
        else {
            // sketch.textStyle(sketch.NORMAL);
            sketch.noStroke();
        }
    };
    sketch.showAllMana = function (tile) {
        if (tile.getVowels().length > 0) {
            sketch.textStyle(sketch.BOLD);
        }
        else {
            sketch.textStyle(sketch.NORMAL);
        }
    };
    sketch.keyPressed = function () {
        if (sketch.keyCode == 38) { //up arrow
            if (!collisionMenu.visible) {
                sketch.walk();
            }
        }
        else if (sketch.key == "e") {
            showEntities = !showEntities;
        }
        else if (sketch.key == "n") {
            game.nextLevel();
        }
        else if (sketch.keyCode == 37) { //left arrow
            if (!collisionMenu.visible) {
                game.rotateDir(Game.player, true);
            }
            else {
                if (collisionMenu.entity instanceof Character
                    && collisionMenu.activeSkill > 0) {
                    collisionMenu.activeSkill += -1;
                }
            }
        }
        else if (sketch.keyCode == 39) { //right arrow
            if (!collisionMenu.visible) {
                game.rotateDir(Game.player, false);
            }
            else {
                if (collisionMenu.entity instanceof Character
                    && collisionMenu.activeSkill < Game.player.skills.length) {
                    collisionMenu.activeSkill += 1;
                }
            }
            game.rotateDir(Game.player, false);
        }
        else if (sketch.key == "p") {
            sketch.pause();
        }
        else if (sketch.key == "z") {
            if (playerMenu.dialogueKey != "") {
                playerMenu.dialogueIndex += 1;
            }
            if (collisionMenu.visible) {
                collisionMenu.closeMenu();
            }
        }
        else if (paused && sketch.key == "c") {
            game.changeLevel(levels[levels.length - 1]);
            sketch.pause();
        }
        else if (sketch.key == "m") {
            if (music.isLooping()) {
                music.pause();
            }
            else {
                music.loop();
            }
        }
        else if (sketch.key = "b") {
            if (Battle.active) {
                game.battle.enqueue(collisionMenu.getActiveSkill());
                game.battle.endTurn();
            }
        }
        sketch.draw();
        return false;
    };
    sketch.screenCoordToTile = function (screenX, screenY) {
        let coord = sketch.screenCoordSubmapper(screenX, screenY);
        let offset = sketch.offsetMap(coord[0], coord[1]);
        screenX -= offset[0];
        screenY -= offset[1];
        return sketch.screenCoordSubmapper(screenX, screenY);
    };
    sketch.screenCoordSubmapper = function (screenX, screenY) {
        let x = Math.round(sketch.map(screenX, marginX, marginX + (game.tileMap.width + 1) * padding, 0, game.tileMap.width + 1));
        let y = Math.round(sketch.map(screenY, marginY, marginY + (game.tileMap.height + 1) * padding, 0, game.tileMap.height + 1));
        return [x, y];
    };
    // Resizes canvas to match wordsearch length.
    sketch.resize = function () {
        sketch.resizeCanvas(game.tileMap.width * padding + marginX, game.tileMap.height * padding + marginY);
    };
    //TODO
    sketch.saveGame = function () {
        let saveState = JSON.stringify(game.toJSON());
        localStorage.setItem("saveState", saveState);
    };
    //TODO
    sketch.loadGame = function () {
        // try {
        let gameSeed = JSON.parse(localStorage.getItem("saveState"));
        let game = new Game(gameSeed);
        // } catch(err) {
        // 	console.log(err);
        // }
    };
    sketch.scrollStyle = function () {
        let ws = document.getElementById("word-search");
        let fade = document.getElementById("ws-fade");
        if (ws.scrollHeight - ws.scrollTop !== ws.clientHeight) {
            console.log("go down");
            fade.classList.add("fade-bottom");
        }
        else {
            fade.classList.remove("fade-bottom");
        }
        if (ws.scrollTop !== 0) {
            console.log("go up");
            fade.classList.add("fade-top");
        }
        else {
            fade.classList.remove("fade-top");
        }
        if (ws.scrollWidth - ws.scrollLeft !== ws.clientWidth) {
            //there is still more to the left 
            console.log("go right");
            fade.classList.add("fade-right");
        }
        else {
            fade.classList.remove("fade-right");
        }
        if (ws.scrollLeft !== 0) {
            //there is still more to the left 
            console.log("go left");
            fade.classList.add("fade-left");
        }
        else {
            fade.classList.remove("fade-left");
        }
    };
    /* View in fullscreen */
    sketch.openFullscreen = function () {
        let elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
        else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        }
        else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen();
        }
        else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
    };
    /* Close fullscreen */
    sketch.closeFullscreen = function () {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        }
        else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        }
        else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    };
};
let main = new p5(seed);
