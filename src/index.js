// Predicate combinators
const andMatch = (p1, p2) => node => p1(node) && p2(node);
const orMatch = (p1, p2) => node => p1(node) || p2(node);
const inverseMatch = p => node => !p(node);
const ALWAYS = () => true;

module.exports = {
  andMatch,
  orMatch,
  inverseMatch,
  ALWAYS
};
