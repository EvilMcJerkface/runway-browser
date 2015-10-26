"use strict";

let errors = require('../errors.js');
let Type = require('./type.js');
let Value = require('./value.js');

// An instance of an EitherType that at any given point in time contains
// exactly one variant.
// The 'tag' attribute will be set to an EitherTag, and 'tag.type' is the
// current EitherVariant. If the variant has record fields, those fields will
// be in an attribute named after the tag name.
class EitherValue extends Value {
  constructor(type) {
    super(type);
    let first = this.type.fieldtypes[0];
    this.tag = first.tag;
    if (first.recordtype !== undefined) {
      this[this.tag.name] = first.recordtype.makeDefaultValue();
    } else {
      // enumvariant has no fields: do nothing
    }
  }

  assign(newValue) {
    if (newValue instanceof EitherValue && this.type == newValue.type) {
      let _ = delete this[this.tag.name];
      this.tag = newValue.tag;
      if (this.tag.name in newValue) {
        this[this.tag.name] = newValue[this.tag.name];
      }
      return;
    }
    if (newValue instanceof EitherTag &&
        newValue.type.parenttype == this.tag.type.parenttype) {
      let _ = delete this[this.tag.name];
      this.tag = newValue;
      return;
    }
    throw new errors.Internal(`Cannot assign value of ${newValue} to ` +
      `either-type ${this.type.getName()}`);
  }

  equals(other) {
    if (this.type != other.type) {
      return false;
    }
    if (this.tag != other.tag) {
      return false;
    }
    if (this.tag.name in this) {
      return this[this.tag.name].equals(other[othe.tag.name]);
    } else {
      return true;
    }
  }

  innerToString() {
    if (this.tag.name in this) {
      return this[this.tag.name].toString();
    } else {
      return this.tag.toString();
    }
  }

  toString() {
    if (this.tag.name in this) {
      let fields = this[this.tag.name].innerToString();
      return `${this.tag.toString()} { ${fields} }`;
    } else {
      return this.tag.toString();
    }
  }
}

// The variants of an either-type are each identified by a tag. The 'type' is
// an EitherVariant.
//
// This goes into the environment as a "constant" for either variants that have
// no record fields.
// For example, in:
//   var x : Boolean = False;
// the 'False' is an EitherTag in the environment.
class EitherTag extends Value {
  constructor(type, name) {
    super(type);
    this.name = name;
  }
  equals(other) {
    return this.type == other.type && this.name == other.name;
  }
  innerToString() {
    return `${this.name}`;
  }
  toString() {
    return `${this.name}`;
  }
}

// In:
//   type T: either { A, B }
// this represents an A or a B, and its parenttype is T.
// Sometimes we know statically that we have an A or a B.
class EitherVariant extends Type {
  constructor(decl, env, name, parenttype) {
    super(decl, env, name);
    this.parenttype = parenttype;
    this.tag = new EitherTag(this, name);
    if (decl.kind == 'enumvariant') {
      this.env.assignVar(name, this.tag);
    } else {
      let makeType = require('./factory.js');
      this.recordtype = makeType(decl.type, this.env);
    }
  }
  toString() {
    return `${this.tag} (EitherVariant)`;
  }
}

// The type T in:
//   type T: either { A, B }
// An EitherType is made up of a set of EitherVariant types (A and B in this
// example).
class EitherType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.fieldtypes = this.decl.fields.map(
      (field) => new EitherVariant(field, this.env, field.id.value, this)
    );
  }
  makeDefaultValue() {
    return new EitherValue(this);
  }
  toString() {
    let name = this.getName();
    if (name !== undefined) {
      return name;
    }
    return 'anonymous either';
  }
}

module.exports = {
  Variant: EitherVariant,
  Type: EitherType,
};