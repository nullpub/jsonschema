import type { Literal } from "https://deno.land/x/fun@v1.0.0/schemable/schemable.ts";

/***************************************************************************************************
 * @section  Types
 **************************************************************************************************/

type NonEmptyArray<T> = readonly [T, ...T[]];

export type Unknown = {};

export type Boolean = { type: "boolean" };

export type Null = { type: "null" };

export type Enum = { enum: NonEmptyArray<Literal> };

export type AllOf = { allOf: NonEmptyArray<Type> };

export type AnyOf = { anyOf: NonEmptyArray<Type> };

export type OneOf = { oneOf: NonEmptyArray<Type> };

export type Ref = { $ref: string };

export type Definitions = Record<string, Type>;

export type String = {
  type: "string";
  enum?: NonEmptyArray<string>;
  minLength?: number;
  maxLength?: number;
};

export type Number =
  | { type: "integer"; enum?: NonEmptyArray<number> } // Integer
  | { type: "number"; enum?: NonEmptyArray<number> }; // Float

// deno-lint-ignore ban-types
export type Object = {
  type: "object";
  properties: Record<string, Type>;
  required?: NonEmptyArray<string>;
  additionalProperties?: false | Type;
};

export type Array = {
  type: "array";
  items: Type | NonEmptyArray<Type>;
  additionalItems?: Type;
};

export type Type =
  & { definitions?: Definitions }
  & (
    | Unknown
    | String
    | Number
    | Object
    | Array
    | Boolean
    | Null
    | Enum
    | AllOf
    | AnyOf
    | OneOf
    | Ref
  );
