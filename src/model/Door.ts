/// <reference path="../_references.ts" />

class Door extends Entity {
	constructor() {
		super("Door");
	}

	playerCollision(): void {
		for (let item of game.player.inventory) {
			if (item.name == "Key") {
				game.newLevel();
			}
		}
	}
}