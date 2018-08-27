#!/usr/bin/env node
/*eslint no-console: 0*/

/*
# Usage

$ knot --infile <infile.knot> --outfile <outfile.json>
OR
$ < knot stream.js
OR
$ echo 'a = 1' | knot
*/

const fs = require('fs');
const miss = require('mississippi');
const argv = require('minimist')(process.argv.slice(2));
const TokenStream = require('token-stream');
const _ = require('lodash');
const debug = require('debug')('knot:interpreter');
const isNumber = require('is-number');
const leftPad = require('left-pad');

const infile = argv.infile;
const outfile = argv.outfile;

const HITCH = '\u0091';
const NEWLINE = '\n';

let instream = process.stdin;

if (infile) {
  instream = fs.createReadStream(infile);
}

const outstream = outfile ? fs.createWriteStream(outfile) : process.stdout;
outstream.writeln = (...args) => {
  const payload = _.flatMap(args).join(' ') + NEWLINE;
  outstream.write(payload);
  return outstream;
};

const errstream = process.stderr;

// const OPERATORS = ['='];
// const TERMINATORS = [';'];

// const KNOWN_TOKENS = [].concat(OPERATORS, TERMINATORS);

class RawToken {
  constructor(token, lineNumber) {
    this.token = token;
    this.lineNumber = lineNumber;
  }

  toString() {
    return `RawToken(${this.token}, L${this.lineNumber})`;
  }
}

const Operators = new Map([['=', 'ASSIGNMENT'], ['+', 'ADDITION']]);

class Token {
  constructor(rawToken) {
    this.lineNumber = rawToken.lineNumber;
    this.rawVal = rawToken.val;
  }
  toString() {
    return `Token(${this.type})`;
  }
}

class Operator extends Token {
  constructor(rawToken) {
    super(rawToken);
    this.type = Operator.type;
    this.which = Operators.get(rawToken.token);
  }
  toString() {
    return `Token(${this.type}, ${this.which})`;
  }
}
Operator.type = 'Operator';

class Terminator extends Token {
  constructor(rawToken) {
    super(rawToken);
    this.type = Terminator.type;
  }
}
Terminator.type = 'Terminator';

class Identifier extends Token {
  constructor(rawToken) {
    super(rawToken);
    this.type = Identifier.type;
    this.name = rawToken.token;
  }
  toString() {
    return `Token(${this.type}, ${this.name})`;
  }
}
Identifier.type = 'Identifier';

class Literal extends Token {
  constructor(rawToken) {
    super(rawToken);
    this.type = Literal.type;
    this.val = rawToken.token;
    const p = parseInt(this.val, 10);
    if (isNumber(p)) {
      this.val = p;
      // this.type = 'number';
    } else {
      // this.type = 'string';
    }
  }
  toString() {
    return `Token(${this.type}, ${this.val})`;
  }
}
Literal.type = 'Literal';

let rawTokens,
  scannedTokens = [],
  environment = new Map();

function lex(buf) {
  let tokenCount = 0;

  const text = buf.toString('utf-8');
  const lines = text.split(/[\n]/);
  debug(`lines: ${lines}`);

  rawTokens = _.flatMap(lines, (l, idx) => {
    return l
      .split(/[\s+]/)
      .filter(t => t.trim().length > 0)
      .map(t => {
        return new RawToken(t, idx);
      });
  });

  const tokenStream = new TokenStream(rawTokens.slice());

  const _this = this;
  function push(token) {
    // _this.push(token);
    scannedTokens.push(token);
  }

  while (true) {
    try {
      let curToken = tokenStream.advance();
      debug(`curToken: ${curToken}`);

      while (/^#/.test(curToken.token)) {
        const curLineNum = curToken.lineNumber;

        while (curToken.lineNumber == curLineNum) {
          curToken = tokenStream.advance();
        }
        debug(`curToken: ${curToken}`);
      }

      if (/.+;$/.test(curToken.token)) {
        curToken = new RawToken(
          curToken.token.split(';')[0],
          curToken.lineNumber
        );
        tokenStream.defer(new RawToken(';', curToken.lineNumber));
      }

      tokenCount += 1;

      if (/[0-9]+/.test(curToken.token)) {
        // integer
        push(new Literal(curToken));
      } else if (/=/.test(curToken.token)) {
        // = operator
        push(new Operator(curToken));
      } else if (/;/.test(curToken.token)) {
        // terminator
        push(new Terminator(curToken));
      } else if (new RegExp(`${HITCH}.*?${HITCH}`).test(curToken.token)) {
        // string
        push(new Literal(curToken));
      } else {
        // identifier
        push(new Identifier(curToken));
      }
    } catch (ex) {
      if (!/Cannot read past the end of a stream/.test(ex.toString()))
        errstream.write(`caught: ${ex}\n`);
      break;
    }
  }

  // debug(`raw tokens:     `, rawTokens);

  return scannedTokens;
}

const _parse = token => {};

const parse = miss.to(_parse);

// returns a string
const leftPadArray = arr => {
  // TODO
  const maxLength = arr
    .map(item => item.toString().length)
    .sort((a, b) => b - a)[0];
  return arr
    .map(item => {
      return leftPad(item, maxLength + 2);
    })
    .join('\n');
};

function main() {
  const pipeline = miss.pipe(
    instream,
    miss.concat(lex),
    end
  );
}

function end(err) {
  if (err) {
    return errstream.write(`${err}\n`);
  }
  outstream.writeln(`scanned tokens: \n`);
  outstream.writeln(leftPadArray(scannedTokens));
  outstream.writeln(`environment:    `);
  for (const [name, val] of environment) {
    outstream.writeln(`${name}=${val}`);
  }
}

if (require.main === module) {
  main();
}
