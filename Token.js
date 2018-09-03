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

Token.noneToken = new Token(Token.none, '');

module.exports = Token;
