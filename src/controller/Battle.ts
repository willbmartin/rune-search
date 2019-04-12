/// <reference path="../_references.ts" />

class Battle {

	protected _enemy: Character;
	protected _countdown: number;
	protected _startingHealth: number;
	protected _health: number;
	protected _skillQueue: Skill[];
	protected _enemyName: string;
	protected _player: Player;
	protected _log: string[];
	protected _statuses: StatusEffect[];
	protected static _active: boolean;

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

	constructor(enemy: Character, countdown: number) {
		Battle._active = true;
		this._enemy = enemy;
		this._startingHealth = this._enemy.health;
		this._countdown = countdown;
		this._skillQueue = new Array<Skill>();
		this._player = Game.player;
		this._log = new Array<string>();
		this._statuses = [];
	}

	get countdown(): number {
		return this._countdown;
	}

	set countdown(x: number) {
		this._countdown = x;
	}

	get skillQueue(): Array<Skill> {
		return this._skillQueue;
	}

	get enemyName(): string {
		return this._enemy.name;
	}

	get log(): string[] {
		return this._log;
	}

	topOfLog(): string {
		return this._log[this._log.length - 1];
	}

	totalCost(): Manager {
		let result = new Manager();
		for (let i = 0; i < this._skillQueue.length; i++) {
			result.add(this._skillQueue[i].cost);
		}
		return result;
	}

	get player(): Player {
		return this._player;
	}

	get statuses(): StatusEffect[] {
		return this._statuses;
	}

	static get active(): boolean {
		return Battle._active;
	}

	static set active(active: boolean) {
		Battle._active = active;
	}

	addStatus(status: StatusEffect) {
		for (let i = 0; i < this._statuses.length; i++) {
			if (this._statuses[i].kind == status.kind) {
				this._statuses[i].increment(status.countdown);
				return;
			}
		}
		this._statuses.push(status);
	}

	changeCountdown(x: number): void {
		this._countdown += x;
	}

	enqueue(s: Skill): boolean {
		if (s != null) {
			if (s.cost.fitsInto(Game.player.mana)) {
				this._skillQueue.push(s);
				Game.player.mana.subtract(s.cost);
				return true;
			} else {
				this.logText("Not enough mana!");
			}
		}
		return false;
	}

	logText(s: string): void {
		this._log.push(s);
	}

	clearQueue(): void {
		this._skillQueue = new Array<Skill>();
	}

	endTurn(): void {
		for (let i = 0; i < this._skillQueue.length; i++) {
			this._skillQueue[i].execute(this);
		}
		let temp: Manager = this.totalCost();
		// Game.player.mana.subtract(temp);
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

	damage(x: number): void {
		this._enemy.health -= x;
		this.runStatusCallbacks("attack");
	}

	damageBypass(x: number): void {
		this._enemy.health -= x;
	}

	heal(x: number): void {
		this._enemy.health += x;
		if (this._enemy.health > this._startingHealth) {
			this._enemy.health = this._startingHealth;
		}
	}

	spoils(): Manager {
		let result = new Manager(this._enemy.name);
		let ratio = Math.abs(this._enemy.health)/this._startingHealth;
		ratio = Math.max(1, Math.floor(ratio));
		result.multiply(ratio);
		return result;
	}

	victory(): void {
		//TODO: more victory code goes here
		collisionMenu.showVictory = true;
		collisionMenu.spoils = this.spoils();
		Game.player.mana.add(collisionMenu.spoils);
		Battle.active = false;
		console.log("battle won!");
	}

	gameover(): void {
		//TODO: game over code goes here
		collisionMenu.showDefeat = true;
		collisionMenu.spoils = this.spoils();
		Game.player.mana.subtract(collisionMenu.spoils);
		Battle.active = false;
		console.log("battle lost :(");
	}

	private runStatusCallbacks(callback: string) {
		for (let i = 0; i < this._statuses.length; i++) {
			this._statuses[i][callback](this);
		}
		let temp = [];
		for (let i = 0; i < this._statuses.length; i++) {
			if (this._statuses[i].countdown > 0) {
				temp.push(this._statuses[i]);
			}
		}
		this._statuses = temp;
	}

}