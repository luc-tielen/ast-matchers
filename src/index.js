// predicate combinators
const andMatch = (predicate1, predicate2) => node =>
  predicate1(node) && predicate2(node);
const orMatch = (predicate1, predicate2) => node =>
  predicate1(node) || predicate2(node);
const inverseMatch = predicate => node => !predicate(node);
const ALWAYS = () => true;

class PredicateBuilder {
  constructor(predicate = ALWAYS) {
    this.predicate = predicate;
  }

  and(predicate) {
    this.predicate = andMatch(this.predicate, predicate);
    return this;
  }

  or(predicate) {
    this.predicate = orMatch(this.predicate, predicate);
    return this;
  }

  inverse() {
    this.predicate = inverseMatch(this.predicate);
    return this;
  }

  build() {
    return this.predicate;
  }
}

module.exports = {
  andMatch,
  orMatch,
  inverseMatch,
  ALWAYS,
  PredicateBuilder
};
