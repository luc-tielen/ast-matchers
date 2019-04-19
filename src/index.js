// Predicate combinators
const andMatch = (p1, p2) => node => p1(node) && p2(node);
const orMatch = (p1, p2) => node => p1(node) || p2(node);
const inverseMatch = p => node => !p(node);
const ALWAYS = () => true;

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

module.exports = {
  andMatch,
  orMatch,
  inverseMatch,
  matchWithin,
  ALWAYS
};
