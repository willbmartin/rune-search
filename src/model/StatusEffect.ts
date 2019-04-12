/// <reference path="../_references.ts" />

class StatusEffect {
	
	private _name: string;
	private _desc: string;
	private _countdown: number;
	private _kind: string;
	private _turnEndCallback: Function;
	private _attackCallback: Function;

	constructor(n: string, d: string, c: number, k: string) {
		this._name = n;
		this._desc = d;
		this._countdown = c;
		this._kind = k;
		this._turnEndCallback = this.trivialFunction();
		this._attackCallback = this.trivialFunction();
	}

	clone(): StatusEffect {
		let clone = new StatusEffect(this._name, this._desc, this._countdown, this._kind);
		clone._turnEndCallback = this._turnEndCallback;
		clone._attackCallback = this._attackCallback;
		return clone;
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

	set turnEndCallback(f: Function) {
		this._turnEndCallback = f;
	}

	set attackCallback(f: Function) {
		this._attackCallback = f;
	}

	increment(x: number = 1) {
		this._countdown += x;
	}

	decrement(x: number = 1) {
		this._countdown -= x;
	}

	attack(b: Battle) {
		this._attackCallback.call(this, b);
	}

	turnEnd(b: Battle) {
		this._turnEndCallback.call(this, b);
	}

	private trivialFunction() {
		return function() {};
	}
	
	static fragileStatus(countdown: number): StatusEffect {
		let status = new StatusEffect("Fragile",
			"Enemy takes %countdown extra damage from all attacks.",
			countdown, "fragile"
		)
		status.attackCallback = function(b: Battle) {
			b.damageBypass(this._countdown);
		}
		return status;
	}

	static poisonStatus(countdown: number): StatusEffect {
		let status = new StatusEffect("Poison",
			"Enemy takes %countdown damage this turn, then loses 1 Poison.",
			countdown, "poison");
		status.turnEndCallback = function(b: Battle) {
			b.damageBypass(this._countdown);
			this._countdown--;
		}
		return status;
	}

	static regenStatus(countdown: number): StatusEffect {
		let status = new StatusEffect("Regen",
			"Enemy heals %countdown HP this turn, then loses 1 Regen.",
			countdown, "regen");
		status.turnEndCallback = function(b: Battle) {
			b.heal(this._countdown);
			this._countdown--;
		}
		return status;
	}

	static hasteStatus(countdown: number) {
		let status = new StatusEffect("Haste",
			"Countdown decreases by 2 for the next %countdown% turn(s).",
			countdown, "haste");
		status.turnEndCallback = function(b: Battle) {
			b.changeCountdown(-1);
			this.countdown--;
		}
		return status;
	}

	static slothStatus(countdown: number) {
		let status = new StatusEffect("Sloth",
			"Countdown doesn't decrease for the next %countdown% turn(s).",
			countdown, "sloth");
		status.turnEndCallback = function(b: Battle) {
			b.changeCountdown(1);
			this.countdown--;
		}
		return status;
	}

}