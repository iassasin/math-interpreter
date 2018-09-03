const operatorLevels = [
	['(', ')', '=>'],
	['='],
	['+', '-'],
	['*', '/', '%'],
];
const rightAssociativeOperators = ['='];
const stopOperators = ['(', ')'];

const operators = '*/%+-=>()';
const validOperators = operatorLevels.reduce((a, x) => (x.forEach(y => a.push(y)), a), []);

const isNumeric = (x) => x >= '0' && x <= '9';
const isAlpha = (x) => x >= 'a' && x <= 'z' || x >= 'A' && x <= 'Z';
const isId = (x) => isAlpha(x) || isNumeric(x) || x == '_';
const isOperator = (x) => operators.indexOf(x) >= 0;
const isSpace = (x) => ' \t\v\n'.indexOf(x) >= 0;

class Token {
	constructor(type, value) {
		this.type = type;
		this.value = value;
	}

	is(type, value) {
		return this.type === type && (value === undefined || this.value === value);
	}
}

Token.none = Symbol('none');
Token.number = Symbol('number');
Token.id = Symbol('id');
Token.operator = Symbol('operator');

const noneToken = new Token(Token.none, '');

const AST = {
	functionDeclaration: Symbol('function-declaration'),
	functionCall: Symbol('function-call'),
	variable: Symbol('variable'),
	literal: Symbol('literal'),
	operator: Symbol('operator'),
};

class Parser {
	constructor() {
		this.context = null;
		this.token = null;
		this.tokens = [];
		this.curIndex = 0;
	}

	next() {
		if (this.curIndex >= this.tokens.length) {
			this.token = noneToken;
			return this.token;
		}

		if (++this.curIndex < this.tokens.length) {
			this.token = this.tokens[this.curIndex];
			return this.token;
		}

		this.token = noneToken;
		return this.token;
	}

	parse(str, context) {
		this.context = context;
		this.setTokens(this.tokenize(str));
		this.next();

		if (this.token.is(Token.none)) {
			return null;
		}

		let result = this.parseExpression();

		if (!this.token.is(Token.none)) {
			throw new Error(`End of expression excepted, but '${this.token.value}' found`);
		}

		return result;
	}

	setTokens(tokens) {
		this.tokens = tokens;
		this.token = null;
		this.curIndex = -1;
	}

	parseExpression() {
		if (this.token.is(Token.id, 'fn')) {
			this.next();
			return this.parseFunctionDeclaration();
		}

		return this.parseArithmeticExpression(0);
	}

	parseFunctionDeclaration() {
		if (!this.token.is(Token.id)) {
			throw new Error('Function name required');
		}

		let name = this.token.value;
		let args = [];
		while (this.next().is(Token.id)) {
			if (args.indexOf(this.token.value) >= 0) {
				throw new Error(`Duplicate argument '${this.token.value}'`);
			}
			args.push(this.token.value);
		}

		if (!this.token.is(Token.operator, '=>')) {
			throw new Error('Excepted operator =>');
		}

		this.next();

		let oldContext = this.context;
		this.context = new Interpreter();
		for (let arg of args) {
			this.context.setVariable(arg, null);
		}

		let body = this.parseArithmeticExpression(0);

		this.context = oldContext;

		return {
			type: AST.functionDeclaration,
			name,
			parameters: args,
			body,
		};
	}

	parseArithmeticExpression(level) {
		let left = this.parseOperand();

		if (!this.token.is(Token.operator, '=') && left.type === AST.variable) {
			let v = this.context.getVariable(left.name);
			if (!v || v.type !== AST.variable) {
				throw new Error(`Undeclared variable '${left.name}'`);
			}
		}

		while (this.token.is(Token.operator)) {
			if (this.token.is(Token.operator, ')')) {
				return left;
			}

			let op = this.token.value;
			let oplevel = this.findOperatorLevel(level, op);

			if (oplevel < 0) {
				return left;
			}

			this.next();
			let right = this.parseArithmeticExpression(rightAssociativeOperators.indexOf(op) >= 0 ? oplevel : oplevel + 1);

			left = {
				type: AST.operator,
				operator: op,
				left,
				right,
			};
		}

		return left;
	}

	parseOperand() {
		if (this.token.is(Token.operator, '(')) {
			this.next();
			let result = this.parseArithmeticExpression(0);

			if (!this.token.is(Token.operator, ')')) {
				throw new Error(`Operator ')' excepted, but '${this.token.value}' found`);
			}

			this.next();
			return result;
		}

		if (this.token.is(Token.id)) {
			let name = this.token.value;
			this.next();

			let v = this.context.getVariable(name);
			if (v && v.type === AST.functionDeclaration) {
				let args = [];
				for (let i = 0; i < v.parameters.length; ++i) {
					args.push(this.parseArithmeticExpression(0));
				}

				return {
					type: AST.functionCall,
					name,
					parameters: args,
				};
			}

			return {
				type: AST.variable,
				name,
			};
		}

		if (this.token.is(Token.number)) {
			let value = +this.token.value;

			this.next();

			return {
				type: AST.literal,
				value,
			};
		}

		throw new Error(`Operand excepted, but '${this.token.value}' found`);
	}

	findOperatorLevel(startLevel, op) {
		for (let i = startLevel; i < operatorLevels.length; ++i) {
			if (operatorLevels[i].indexOf(op) >= 0) {
				return i;
			}
		}

		return -1;
	}

	tokenize(str) {
		if (typeof str !== 'string') {
			throw new Error('Input is not a string');
		}

		let tokens = [];

		let token = '';
		let type = Token.none;

		let len = str.length;
		let i = 0;
		while (i < len) {
			let c = str[i];

			if (isSpace(c)) {
				++i;
			}
			else if (isNumeric(c)) {
				type = Token.number;

				let wasDot = false;
				while (i < len && (isNumeric(c) || c == '.')) {
					if (c == '.') {
						if (wasDot) {
							throw new Error('Only one dot permitted in number');
						}
						wasDot = true;
					}

					token += c;
					++i; c = str[i];
				}

				if (token[token.length - 1] == '.') {
					throw new Error('Number must not end with "."');
				}
			}
			else if (isId(c)) {
				type = Token.id;

				while (i < len && isId(c)) {
					token += c;
					++i; c = str[i];
				}

				if (token == '_') {
					throw new Error('Identifier must be not only "_"');
				}
			}
			else if (isOperator(c)) {
				type = Token.operator;

				while (i < len && stopOperators.indexOf(token) < 0 && isOperator(c)) {
					token += c;
					++i; c = str[i];
				}

				if (validOperators.indexOf(token) < 0) {
					throw new Error(`Unknown operator '${token}'`);
				}
			}
			else {
				throw new Error(`Unknown symbol '${c}'`);
			}

			if (type != Token.none) {
				tokens.push(new Token(type, token));
			}

			token = '';
			type = Token.none;
		}

		return tokens;
	}
}

class Interpreter {
	constructor() {
		this.parser = null;
		this.vars = {};
	}

	interpret(ast) {
		let v = null;
		switch (ast.type) {
			case AST.literal:
				return ast.value;

			case AST.variable:
				v = this.getVariable(ast.name);
				if (!v || v.type !== AST.variable) {
					throw new Error(`Undeclared variable '${ast.name}'`);
				}

				return v.value;

			case AST.operator:
				if (ast.operator === '=') {
					if (ast.left.type !== AST.variable) {
						throw new Error(`Excepted variable in assignment left operand`);
					}

					let name = ast.left.name;
					let result = this.interpret(ast.right);

					v = this.getVariable(name);
					if (v && v.type !== AST.variable) {
						throw new Error(`Name conflict: function '${name}' exists`);
					}

					this.setVariable(name, result);

					return result;
				}

				let left = this.interpret(ast.left);
				let right = this.interpret(ast.right);

				switch (ast.operator) {
					case '+': return left + right;
					case '-': return left - right;
					case '*': return left * right;
					case '/': return left / right;
					case '%': return left % right;

					default:
						throw new Error(`Unknown operator ${ast.operator}`);
				}

			case AST.functionDeclaration:
				v = this.getVariable(ast.name);
				if (v && v.type !== AST.functionDeclaration) {
					throw new Error(`Name conflict: variable '${ast.name}' exists`);
				}

				this.setFunction(ast.name, ast);
				return '';

			case AST.functionCall:
				let f = this.getVariable(ast.name);
				if (!f || f.type !== AST.functionDeclaration) {
					throw new Error(`Undeclared function '${ast.name}'`);
				}

				if (f.parameters.length != ast.parameters.length) {
					throw new Error(`Excepted ${f.parameters.length}, but got ${ast.parameters.length} for function '${ast.name}'`);
				}

				let context = new Interpreter();
				let i = 0;
				for (let param of f.parameters) {
					context.setVariable(param, this.interpret(ast.parameters[i]));
					++i;
				}

				return context.interpret(f.body);

			default:
				throw new Error(`Unknown ast type: ${ast.type}`);
		}
	}

	getVariable(name) {
		if (this.vars.hasOwnProperty(name)) {
			return this.vars[name];
		}

		return null;
	}

	setVariable(name, value) {
		this.vars[name] = {
			type: AST.variable,
			value,
		};
	}

	setFunction(name, value) {
		this.vars[name] = value;
	}

	input(str) {
		if (this.parser === null) {
			this.parser = new Parser();
		}

		let ast = this.parser.parse(str, this);

		return ast !== null ? this.interpret(ast) : '';
	}
}

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
