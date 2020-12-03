import type * as TC from "https://deno.land/x/hkts@v0.0.41/type_classes.ts";
import type { State } from "https://deno.land/x/hkts@v0.0.41/state.ts";
import type {
  NonEmptyRecord,
  _,
} from "https://deno.land/x/hkts@v0.0.41/types.ts";
import type {
  Schemable as SchemableT,
  TupleSchemable,
  Literal,
} from "https://deno.land/x/hkts@v0.0.41/schemable.ts";

import * as S from "https://deno.land/x/hkts@v0.0.41/state.ts";
import * as R from "https://deno.land/x/hkts@v0.0.41/record.ts";
import { constant, pipe } from "https://deno.land/x/hkts@v0.0.41/fns.ts";

import type * as Json from "./types.ts";

/***************************************************************************************************
 * @section Types
 **************************************************************************************************/

export type JsonSchema<A> = State<Json.Definitions, Json.Type>;

export type TypeOf<T> = T extends JsonSchema<infer A> ? A : never;

type NonEmptyArray<T> = readonly [T, ...T[]];

/***************************************************************************************************
 * @section Utilities
 **************************************************************************************************/

const { concat }: TC.Semigroup<Json.Definitions> = {
  concat: (a, b) => Object.assign({}, a, b),
};

/***************************************************************************************************
 * @section Constructors
 **************************************************************************************************/

const createJsonString = (
  props: Omit<Json.String, "type"> = {}
): Json.String => ({
  ...props,
  type: "string",
});

const createJsonNumber = (
  props: Omit<Json.Number, "type"> = {}
): Json.Number => ({
  ...props,
  type: "number",
});

const createJsonInteger = (
  props: Omit<Json.Number, "type"> = {}
): Json.Number => ({
  ...props,
  type: "integer",
});

const createJsonObject = (props: Omit<Json.Object, "type">): Json.Object => ({
  ...props,
  type: "object",
});

const createJsonArray = (props: Omit<Json.Array, "type">): Json.Array => ({
  ...props,
  type: "array",
});

const createJsonBoolean = (
  props: Omit<Json.Boolean, "type"> = {}
): Json.Boolean => ({ ...props, type: "boolean" });

const createJsonNull = (props: Omit<Json.Null, "type"> = {}): Json.Null => ({
  ...props,
  type: "null",
});

const createJsonEnum = (schemas: NonEmptyArray<Literal>): Json.Enum => ({
  enum: schemas,
});

const createJsonAllOf = (allOf: NonEmptyArray<Json.Type>): Json.AllOf => ({
  allOf,
});

const createJsonAnyOf = (anyOf: NonEmptyArray<Json.Type>): Json.AnyOf => ({
  anyOf,
});

const createJsonOneOf = (oneOf: NonEmptyArray<Json.Type>): Json.OneOf => ({
  oneOf,
});

const createJsonRef = (id: string): Json.Ref => ({
  $ref: `#/definitions/${id}`,
});

/***************************************************************************************************
 * @section Combinators
 **************************************************************************************************/

export const nullable = <A>(or: JsonSchema<A>): JsonSchema<null | A> =>
  pipe(
    or,
    S.map((a) => createJsonAnyOf([createJsonNull(), a]))
  );

/***************************************************************************************************
 * @section Schemables
 **************************************************************************************************/

export const literal = <A extends readonly [Literal, ...Literal[]]>(
  ...values: A
): JsonSchema<A[number]> => S.of(createJsonEnum(values));

export const string: JsonSchema<string> = S.of(createJsonString());

export const number: JsonSchema<number> = S.of(createJsonNumber());

export const boolean: JsonSchema<boolean> = S.of(createJsonBoolean());

export const type = <P extends Record<string, JsonSchema<unknown>>>(
  properties: NonEmptyRecord<P>
): JsonSchema<{ [K in keyof P]: TypeOf<P[K]> }> =>
  pipe(
    S.sequenceStruct(properties as Record<string, JsonSchema<P[keyof P]>>),
    S.map((properties) =>
      // deno-lint-ignore no-explicit-any
      createJsonObject({
        properties,
        required: (Object.keys(properties) as unknown) as NonEmptyArray<string>,
      })
    )
  );

export const partial = <P extends Record<string, JsonSchema<unknown>>>(
  properties: P
): JsonSchema<Partial<{ [K in keyof P]: TypeOf<P[K]> }>> =>
  pipe(
    S.sequenceStruct(properties as Record<string, JsonSchema<P[keyof P]>>),
    S.map((properties) => createJsonObject({ properties }))
  );

export const array = <A>(item: JsonSchema<A>): JsonSchema<readonly A[]> =>
  pipe(
    item,
    S.map((items) => createJsonArray({ items }))
  );

export const record = <A>(
  schema: JsonSchema<A>
): JsonSchema<Record<string, A>> =>
  pipe(
    schema,
    S.map((additionalProperties) =>
      createJsonObject({ properties: {}, additionalProperties })
    )
  );

export const tuple = <A extends NonEmptyArray<unknown>>(
  ...components: { [K in keyof A]: JsonSchema<A[K]> }
): JsonSchema<A> =>
  pipe(
    S.sequenceTuple(...(components as NonEmptyArray<JsonSchema<keyof A>>)),
    S.map((items) => createJsonArray({ items }))
  );

export const union = <MS extends NonEmptyArray<JsonSchema<unknown>>>(
  ...members: MS
): JsonSchema<TypeOf<MS[keyof MS]>> =>
  pipe(
    S.sequenceTuple(...(members as NonEmptyArray<JsonSchema<MS[keyof MS]>>)),
    S.map((items) => createJsonAnyOf(items))
  );

export const intersect = <A, B>(
  left: JsonSchema<A>,
  right: JsonSchema<B>
): JsonSchema<A & B> =>
  pipe(
    S.sequenceTuple(left, right),
    S.map((items) => createJsonAllOf(items))
  );

export const sum = <T extends string, A>(
  tag: T,
  members: { [K in keyof A]: JsonSchema<A[K] & { [K in T]: string }> }
): JsonSchema<A[keyof A]> =>
  pipe(
    S.sequenceStruct(members as Record<string, JsonSchema<A[keyof A]>>),
    S.map((r) =>
      createJsonOneOf((Object.values(r) as unknown) as NonEmptyArray<Json.Type>)
    )
  );

export const lazy = <A>(id: string, f: () => JsonSchema<A>): JsonSchema<A> => {
  let returnRef = false;
  const ref = createJsonRef(id);

  return (s) => {
    if (returnRef) {
      return [ref, s];
    }
    returnRef = true;
    const [schema, defs] = f()(s);
    const definitions = [{ [id]: schema }, defs, s].reduce(concat);
    return [ref, definitions];
  };
};

/***************************************************************************************************
 * @section Utilities
 **************************************************************************************************/

export const print = <A>(schema: JsonSchema<A>): Json.Type => {
  const result = schema({});
  return {
    definitions: result[1],
    ...result[0],
  };
};

/***************************************************************************************************
 * @section Modules
 **************************************************************************************************/

export const Schemable: SchemableT<JsonSchema<_>> = {
  literal,
  string: constant(string),
  number: constant(number),
  boolean: constant(boolean),
  nullable: nullable,
  type,
  partial,
  record,
  array,
  tuple: tuple as TupleSchemable<JsonSchema<_>, 1>,
  intersect,
  sum,
  lazy,
};
