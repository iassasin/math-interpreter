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

// FIXME: hotfix of cross reference (Interpreter x Parser)
module.exports = Interpreter;

const Parser = require('./Parser');
const AST = require('./Ast');
