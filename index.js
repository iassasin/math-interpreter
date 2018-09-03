const Interpreter = require('./Interpreter');

let interpreter = new Interpreter();

let stdin = process.openStdin();
stdin.on('data', (buffer) => {
	let str = buffer.toString();
	try {
		let result = interpreter.input(str);
		process.stdout.write(`  ${result}\n\n`);
	} catch (e) {
		console.error(e);
	}
	process.stdout.write('> ');
});
process.stdout.write('> ');
