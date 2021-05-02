import type * as HKT from "https://deno.land/x/fun@v1.0.0/hkt.ts";
import type * as TC from "https://deno.land/x/fun@v1.0.0/type_classes.ts";
import type * as SC from "https://deno.land/x/fun@v1.0.0/schemable/schemable.ts";
import type { State } from "https://deno.land/x/fun@v1.0.0/state.ts";
import type { NonEmptyRecord } from "https://deno.land/x/fun@v1.0.0/types.ts";

import * as S from "https://deno.land/x/fun@v1.0.0/state.ts";
import {
  createSequenceStruct,
  createSequenceTuple,
} from "https://deno.land/x/fun@v1.0.0/sequence.ts";
import { constant, pipe } from "https://deno.land/x/fun@v1.0.0/fns.ts";

import type * as Json from "./types.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type JsonSchema<A> = State<Json.Definitions, Json.Type>;

export type TypeOf<T> = T extends JsonSchema<infer A> ? A : never;

type NonEmptyArray<T> = readonly [T, ...T[]];

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "JsonSchema";

export type URI = typeof URI;

declare module "https://deno.land/x/fun@v1.0.0/hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: JsonSchema<_[0]>;
  }
}

/*******************************************************************************
 * Utilities
 ******************************************************************************/

const { concat }: TC.Semigroup<Json.Definitions> = {
  concat: (a) => (b) => Object.assign({}, a, b),
};

const sequenceStruct = createSequenceStruct(S.Apply);

const sequenceTuple = createSequenceTuple(S.Apply);

/*******************************************************************************
 * Constructors
 ******************************************************************************/

const of = <A = never>(t: Json.Type): JsonSchema<A> => S.of(t);

/*******************************************************************************
 * Schemables
 ******************************************************************************/

export const UnknownSchemable: SC.UnknownSchemable<URI> = {
  unknown: constant(of({})),
};

export const StringSchemable: SC.StringSchemable<URI> = {
  string: constant(of({ type: "string" })),
};

export const NumberSchemable: SC.NumberSchemable<URI> = {
  number: constant(of({ type: "number" })),
};

export const BooleanSchemable: SC.BooleanSchemable<URI> = {
  boolean: constant(of({ type: "boolean" })),
};

export const LiteralSchemable: SC.LiteralSchemable<URI> = {
  literal: (...schemas) => of({ enum: schemas }),
};

export const NullableSchemable: SC.NullableSchemable<URI> = {
  nullable: (or) =>
    pipe(
      sequenceTuple(or, of({ type: "null" })),
      S.map((anyOf) => ({ anyOf })),
    ),
};

// TODO expand on this to be more specific
export const UndefinableSchemable: SC.UndefinableSchemable<URI> = {
  undefinable: (or) =>
    pipe(
      sequenceTuple(or, of({})),
      S.map((anyOf) => ({ anyOf })),
    ),
};

export const RecordSchemable: SC.RecordSchemable<URI> = {
  record: (codomain) =>
    pipe(
      codomain,
      S.map((additionalProperties) => ({
        type: "object",
        properties: {},
        additionalProperties,
      })),
    ),
};

export const ArraySchemable: SC.ArraySchemable<URI> = {
  array: (item) =>
    pipe(
      item,
      S.map((items) => ({ type: "array", items })),
    ),
};

export const TupleSchemable: SC.TupleSchemable<URI> = {
  tuple: (...components) =>
    pipe(
      sequenceTuple(
        ...(components as unknown as NonEmptyArray<
          JsonSchema<keyof typeof components>
        >),
      ),
      S.map((items) => ({ type: "array", items })),
    ),
};

export const StructSchemable: SC.StructSchemable<URI> = {
  struct: (props) =>
    pipe(
      sequenceStruct(props as Record<string, JsonSchema<unknown>>),
      S.map((properties) => ({
        type: "object",
        properties,
        required: Object.keys(properties).sort() as unknown as NonEmptyArray<
          string
        >,
      })),
    ),
};

export const PartialSchemable: SC.PartialSchemable<URI> = {
  partial: (props) =>
    pipe(
      sequenceStruct(props as Record<string, JsonSchema<unknown>>),
      S.map((properties) => ({
        type: "object",
        properties,
      })),
    ),
};

export const IntersectionSchemable: SC.IntersectSchemable<URI> = {
  intersect: (and) =>
    (ta) =>
      pipe(
        sequenceTuple(and, ta),
        S.map((allOf) => ({ allOf })),
      ),
};

export const UnionSchemable: SC.UnionSchemable<URI> = {
  union: (or) =>
    (ta) =>
      pipe(
        sequenceTuple(or, ta),
        S.map((anyOf) => ({ anyOf })),
      ),
};

export const LazySchemable: SC.LazySchemable<URI> = {
  lazy: (id, f) => {
    let returnRef = false;
    const ref: Json.Ref = { $ref: `#/definitions/${id}` };

    return (s) => {
      if (returnRef) {
        return [ref, s];
      }
      returnRef = true;
      const [schema, defs] = f()(s);
      let definitions = concat({ [id]: schema })(defs);
      definitions = concat(definitions)(s);
      return [ref, definitions];
    };
  },
};

/*******************************************************************************
 * Utilities
 ******************************************************************************/

export const print = <A>(jsonschema: JsonSchema<A>): Json.Type => {
  const [schema, definitions] = jsonschema({});
  return {
    ...schema,
    definitions,
  };
};

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Schemable: SC.Schemable<URI> = {
  ...UnknownSchemable,
  ...StringSchemable,
  ...NumberSchemable,
  ...BooleanSchemable,
  ...LiteralSchemable,
  ...NullableSchemable,
  ...UndefinableSchemable,
  ...RecordSchemable,
  ...ArraySchemable,
  ...TupleSchemable,
  ...StructSchemable,
  ...PartialSchemable,
  ...IntersectionSchemable,
  ...UnionSchemable,
  ...LazySchemable,
};

export const unknown = Schemable.unknown();

export const string = Schemable.string();

export const number = Schemable.number();

export const boolean = Schemable.boolean();

export const literal = Schemable.literal;

export const nullable = Schemable.nullable;

export const undefinable = Schemable.undefinable;

export const record = Schemable.record;

export const array = Schemable.array;

export const tuple = Schemable.tuple;

export const struct = Schemable.struct;

export const partial = Schemable.partial;

export const intersect = Schemable.intersect;

export const union = Schemable.union;

export const lazy = Schemable.lazy;
