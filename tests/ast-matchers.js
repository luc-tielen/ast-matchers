const path = require("path");
const { andMatch, orMatch, inverseMatch, ALWAYS } = require(path.resolve(
  __dirname,
  "../src/index.js"
));
const chai = require("chai");
const expect = chai.expect;

// AST setup code
const VALUE_TYPE = Symbol();
const BINOP_TYPE = Symbol();
const num = value => ({ type: VALUE_TYPE, value });
const binOp = op => (a, b) => ({ type: BINOP_TYPE, op, a, b });
const plus = binOp("+");
const mul = binOp("*");
const sub = binOp("-");

const astToString = node => {
  switch (node.type) {
    case BINOP_TYPE:
      return astToString(node.a) + " " + node.op + " " + astToString(node.b);
    case VALUE_TYPE:
      return node.value.toString();
    default:
      throw new Error("Unsupported type!");
  }
};

// AST to experiment with
const ast = mul(plus(num(1), num(2)), num(3));

// Only checks 1 level directly below
const matchWithin = p => node => {
  switch (node.type) {
    case BINOP_TYPE:
      return p(node.a) || p(node.b);
    case VALUE_TYPE:
      return false;
    default:
      throw new Error("Unsupported type!");
  }
};

// Applying transforms

const applyIfMatches = (handler, node) => multiApplyIfMatches([handler], node);

const multiApplyIfMatches = (matchers, node) =>
  matchers.reduce(
    (acc, { matcher, transform }) => (matcher(acc) ? transform(acc) : acc),
    node
  );

// Traversals

const doTraverseAST = f => node => {
  switch (node.type) {
    case BINOP_TYPE:
      const newA = doTraverseAST(f)(node.a);
      const newB = doTraverseAST(f)(node.b);
      const newOp =
        newA === node.a && newB === node.b ? node : binOp(node.op)(newA, newB);
      return f(newOp);
    case VALUE_TYPE:
      return f(node);
    default:
      throw new Error("Unsupported type!");
  }
};

const singleTraverseAST = handler =>
  doTraverseAST(node => applyIfMatches(handler, node));

const traverseAST = handlers =>
  doTraverseAST(node => multiApplyIfMatches(handlers, node));

// Some example predicates (used below)

const isNum = node => node.type === VALUE_TYPE;

const isBinOp = node => node.type === BINOP_TYPE;

const hasVal = value => node => node.value === value;

const hasValue = value => andMatch(isNum, hasVal(value));

const hasOp = op => andMatch(isBinOp, node => node.op === op);

describe("AST matchers", () => {
  context("single predicate", () => {
    it("can match values in AST", () => {
      const transform = node => num(node.value * 2);
      const result = singleTraverseAST({ matcher: isNum, transform })(ast);
      expect(astToString(result)).to.eql("2 + 4 * 6");
    });

    it("can match binary ops in AST", () => {
      const transform = node => sub(node.a, node.b);
      const result = singleTraverseAST({ matcher: isBinOp, transform })(ast);
      expect(astToString(result)).to.eql("1 - 2 - 3");
    });
  });

  context("multiple predicates", () => {
    it("can match values in AST", () => {
      const has2 = hasValue(2);
      const transform = node => num(node.value + 1);
      const result = singleTraverseAST({ matcher: has2, transform })(ast);
      expect(astToString(result)).to.eql("1 + 3 * 3");
    });

    it("can match binary ops in AST", () => {
      const hasPlus = hasOp("+");
      const transform = node => mul(node.a, node.b);
      const result = singleTraverseAST({ matcher: hasPlus, transform })(ast);
      expect(astToString(result)).to.eql("1 * 2 * 3");
    });
  });

  it("can perform an inverse match in AST", () => {
    const hasNot2 = andMatch(isNum, inverseMatch(hasValue(2)));
    const transform = node => num(node.value + 1);
    const result = singleTraverseAST({ matcher: hasNot2, transform })(ast);
    expect(astToString(result)).to.eql("2 + 2 * 4");
  });

  it("is possible to match on every node AST", () => {
    const transform = node => {
      switch (node.type) {
        case BINOP_TYPE:
          return binOp(node.op)(node.b, node.a);
        case VALUE_TYPE:
          return num(-node.value);
      }
    };
    const result = singleTraverseAST({ matcher: ALWAYS, transform })(ast);
    expect(astToString(result)).to.eql("-3 * -2 + -1");
  });

  it("is possible to remove parts of the AST after a match", () => {
    const scenarios = [
      { transform: node => node.a, expected: "1" },
      { transform: node => node.b, expected: "3" }
    ];
    for (const { transform, expected } of scenarios) {
      const result = singleTraverseAST({ matcher: isBinOp, transform })(ast);
      expect(astToString(result)).to.eql(expected);
    }
  });

  context("alternative predicates", () => {
    it("can performs transform if 1 of predicates succeeds", () => {
      const has2Or3 = andMatch(isNum, orMatch(hasVal(2), hasVal(3)));
      const transform = node => num(node.value + 1);
      const result = singleTraverseAST({ matcher: has2Or3, transform })(ast);
      expect(astToString(result)).to.eql("1 + 3 * 4");
    });
  });

  context("matching direct child nodes in AST", () => {
    it("can perform transform on node if child matches a predicate", () => {
      const binOpWithVal2 = andMatch(isBinOp, matchWithin(hasValue(2)));
      const transform = node => num(node.a.value * 4);
      const result = singleTraverseAST({ matcher: binOpWithVal2, transform })(
        ast
      );
      expect(astToString(result)).to.eql("4 * 3");
    });
  });

  context("multiple matchers", () => {
    it("can perform multiple transforms in 1 traversal", () => {
      const has2 = hasValue(2);
      const has3 = hasValue(3);
      const transform1 = node => num(node.value + 1);
      const transform2 = node => num(node.value - 4);
      const matchers = [
        { matcher: has2, transform: transform1 },
        { matcher: has3, transform: transform2 }
      ];
      const result = traverseAST(matchers)(ast);
      expect(astToString(result)).to.eql("1 + -1 * -1");
    });
  });
});
