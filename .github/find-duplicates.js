const fs = require('fs')
const path = require('path')

async function loadDir(dir) {
	const entries = await fs.promises.readdir(dir, {withFileTypes: true});
	for (const entry of entries) {
		if (entry.isDirectory()) {
			await loadDir(path.join(dir, entry.name));
		} else if (entry.isFile() && entry.name.endsWith('.txt')) {
			await loadFile(path.join(dir, entry.name));
		}
	}
}

class Term {
	constructor(hash) {
		this.hash = hash;
		this.cards = new Set;
	}

	registerCard(card) {
		this.cards.add(card);
	}

	toString() {
		return [...new Set([...this.cards].map(card => card.toString()))].join(' / ');
	}

	static hash(text) {
		return text
			.normalize('NFD')
			.replace(/\W/g, '')
			.toLowerCase();
	}

	static instances = {}

	static getInstance(text) {
		const hash = Term.hash(text);
		if (Term.instances.hasOwnProperty(hash)) {
			return Term.instances[hash];
		} else {
			return Term.instances[hash] = new Term(hash);
		}
	}
}

class Card {
	constructor(deck, line) {
		this.deck = deck;
		this.text = line;
		this.term = Term.getInstance(this.text);
		this.term.registerCard(this);
		Card.instances.add(this);
	}

	toString() {
		return this.text;
	}

	static instances = new Set;
}

class Deck {
	constructor(path) {
		this.path = path;
		this.cards = new Set;
		Deck.instances.add(this);
		this.numDuplicates = 0;
	}

	addCard(card) {
		this.cards.add(card);
	}

	static instances = new Set;
}

async function loadFile(path) {
	const deck = new Deck(path);
	const text = await fs.promises.readFile(path, 'utf-8');
	for (const line of text.split(/\r?\n/)) {
		if (line) {
			deck.addCard(new Card(deck, line));
		}
	}
}

async function main() {
	console.log("Loading cards...");
	await loadDir(path.join(__dirname, '..', 'cards'));
	console.log("Finding duplicates...");
	console.log();
	let numDuplicates = 0;
	for (const term of Object.values(Term.instances)) {
		if (term.cards.size > 1) {
			numDuplicates++;
			console.log(`Found duplicate: ${colors.white}${term}${colors.reset}`);
			for (const card of term.cards) {
				card.deck.numDuplicates++;
				console.log("\t" + card.deck.path);
			}
			console.log();
		}
	}
	if (numDuplicates === 0) {
		console.log(`${colors.white}${colors.green}No duplicates found${colors.reset} 🎉`)
		return 0;
	} else {
		console.log(`${numDuplicates} duplicates found. Statistics:`);
		for (const deck of Deck.instances) {
			let color = "";
			if (deck.numDuplicates === 0) {
				color = colors.green;
			} if (deck.numDuplicates > 5) {
				color = colors.yellow;
			} if (deck.numDuplicates > 50) {
				color = colors.red;
			}

			console.log(`${color}${(deck.numDuplicates / deck.cards.size * 100).toFixed(2).padStart(6)}% ${deck.path}${colors.reset} (${deck.numDuplicates})`);
		}
		console.log(`Total ratio: ${colors.white}${(numDuplicates / [...Object.values(Term.instances)].length * 100).toFixed(2)}%${colors.reset}`)
		return 1;
	}
}

const colors = {
	white: "\033[1m",
	red: "\033[31m",
	green: "\033[32m",
	yellow: "\033[33m",
	reset: "\033[0m",
}

main().then(r => process.exit(r), e => {
	console.error(e);
	process.exit(2);
})
