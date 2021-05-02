# JsonSchema for Deno [![Coverage Status](https://coveralls.io/repos/github/nullpub/jsonschema/badge.svg?branch=main)](https://coveralls.io/github/nullpub/jsonschema?branch=main)

A library for constructing JsonSchemas and TypeScript types simultaneously.

## Usage

This library is a collection of combinators that can be used to construct
json schemas and their associated TypeScript types at the same time. It follows
the pattern laid down by gcanti in io-ts. Following is the simple usage case:

```ts
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";

/**
 * Declare the type using json_schema combinators
 */
const MyType = J.type({
  foo: J.partial({
    bar: J.array(J.literal(1, 2)),
  }),
});

/**
 * Derive the TypeScript from the JsonSchema instance
 * Equivalent to:
 *
 * type MyType = {
 *   foo: Partial<{
 *     bar: readonly (1 | 2)[];
 *   }>;
 * }
 */
type MyType = J.TypeOf<typeof MyType>;

/**
 * Print the stringified json schema
 * Equivalent to:
 *
 * {
 *   "definitions": {},
 *   "properties": {
 *     "foo": {
 *       "properties": {
 *         "bar": {
 *           "items": {
 *             "enum": [
 *               1,
 *               2
 *             ]
 *           },
 *           "type": "array"
 *         }
 *       },
 *       "type": "object"
 *     }
 *   },
 *   "required": [
 *     "foo"
 *   ],
 *   "type": "object"
 * }
 */
console.log(JSON.stringify(J.print(MyType)));
```

There is also an export of a Schemable for use with [fun](https://deno.land/x/fun).
If you use the functional Schemable `make` function to create a `Schemable` you can use
that to generate a jsonschema as well.

```ts
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";
import * as S from "https://deno.land/x/fun@v1.0.0/schemable/schemable.ts";

/**
 * Declare the type using schemable combinators
 */
const MyType = S.make((s) =>
  s.type({
    foo: s.partial({
      bar: s.array(s.literal(1, 2)),
    }),
  })
);

/**
 * Derive the TypeScript from the Schemable instance
 * Equivalent to:
 *
 * type MyType = {
 *   foo: Partial<{
 *     bar: readonly (1 | 2)[];
 *   }>;
 * }
 */
type MyType = S.TypeOf<typeof MyType>;

/**
 * Generate the JsonSchema from the Schemable
 */
const MyTypeJsonSchema = MyType(J.Schemable);

/**
 * Print the strigified json schema
 * Equivalent to:
 *
 * {
 *   "definitions": {},
 *   "properties": {
 *     "foo": {
 *       "properties": {
 *         "bar": {
 *           "items": {
 *             "enum": [
 *               1,
 *               2
 *             ]
 *           },
 *           "type": "array"
 *         }
 *       },
 *       "type": "object"
 *     }
 *   },
 *   "required": [
 *     "foo"
 *   ],
 *   "type": "object"
 * }
 */
console.log(JSON.stringify(J.print(MyTypeJsonSchema), null, 2));
```

As you can see, there is very little difference. The benefit is that
a `Schemable` can also be used to generate a fun [decoder](https://deno.land/x/fun/schemabledecoder.ts).

Lastly, this library properly handles recursive types/schemas with the `lazy` combinator. Unfortunately,
the recursive type must be defined as a typescript type since type inference can't name recursive types for you.

```ts
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";

type Foo = {
  foo?: Foo;
  bar: string;
};

const Foo: J.JsonSchema<Foo> = J.lazy("Foo", () =>
  J.intersect(J.partial({ foo: Foo }), J.type({ bar: J.string }))
);

console.log(JSON.stringify(J.print(Foo), null, 2));
// Prints
// {
//   "$ref": "#/definitions/Foo",
//   "definitions": {
//     "Foo": {
//       "allOf": [
//         {
//           "properties": {
//             "foo": {
//               "$ref": "#/definitions/Foo"
//             }
//           },
//           "type": "object"
//         },
//         {
//           "properties": {
//             "bar": {
//               "type": "string"
//             }
//           },
//           "required": [
//             "bar"
//           ],
//           "type": "object"
//         }
//       ]
//     }
//   }
// }
```

Additionally, mutual recursion is also possible:

```ts
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";

const Bar = J.lazy("Bar", () =>
  J.type({
    foo: Foo,
  })
);
type Bar = J.TypeOf<typeof Bar>;

type Foo = {
  bar: Bar[];
  baz: string;
};

const Foo: J.JsonSchema<Foo> = J.lazy("Foo", () =>
  J.type({
    bar: J.array(Bar),
    baz: J.string,
  })
);

console.log(JSON.stringify(J.print(Foo), null, 2));
// {
//   "$ref": "#/definitions/Foo",
//   "definitions": {
//     "Foo": {
//       "properties": {
//         "bar": {
//           "items": {
//             "$ref": "#/definitions/Bar"
//           },
//           "type": "array"
//         },
//         "baz": {
//           "type": "string"
//         }
//       },
//       "required": [
//         "bar",
//         "baz"
//       ],
//       "type": "object"
//     },
//     "Bar": {
//       "properties": {
//         "foo": {
//           "$ref": "#/definitions/Foo"
//         }
//       },
//       "required": [
//         "foo"
//       ],
//       "type": "object"
//     }
//   }
// }
```

## Api

### Types

| Type                                 | Notes                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `JsonSchema<A>`                      | An alias of the `State` Monad that evaluates to a `[Json.Type, Json.Definitions]`          |
| `TypeOf<T>`                          | A type extraction tool used to get the TypeScript type representation of a `JsonSchema<A>` |
| `import * as Json from "./types.ts"` | Partial TypeScript type implementations of actual Json Schema                              |

### Combinators

| Combinator | Description                                                                                                                   | Example                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| nullable   | Takes in a `JsonSchema<A>` and returns a `JsonSchema` of the union `A and null`                                               | `J.nullable(J.string)`                                                 |
| literal    | Takes in a variadic number of `Primitive` values and a union of those literals                                                | `J.literal(1, 2, 3, "a", "b", "c")`                                    |
| string     | Returns a `JsonSchema<string>`                                                                                                | `J.string`                                                             |
| number     | Returns a `JsonSchema<number>`                                                                                                | `J.number`                                                             |
| boolean    | Returns a `JsonSchema<boolean>`                                                                                               | `J.boolean`                                                            |
| type       | Takes in a `Record<string, JsonSchema<any>` and returns a JsonSchema `object` with the same shape with all fields required    | `J.type({ foo: J.string, bar: J.number })`                             |
| partial    | Takes in a `Record<string, JsonSchema<any>` and returns a JsonSchema `object` with the same shape                             | `J.partial({ foo: J.string, bar: J.number })`                          |
| array      | Takes in a `JsonSchema<A>` and returns a `JsonSchema<Array<A>>`                                                               | `J.array(J.string)`                                                    |
| record     | Takes in a `JsonSchema<A>` and returns a `JsonSchema<Record<string, A>>`                                                      | `J.record(J.string)`                                                   |
| tuple      | Takes in a variadic number of args like `JsonSchema<string>, JsonSchema<number>` and returns a `JsonSchema<[string, number]>` | `J.tuple(J.string, J.number)`                                          |
| union      | Takes in a variadic number of and returns thier union                                                                         | `J.union(J.number, J.string)`                                          |
| intersect  | Takes in exactly two schemas and returns their intersection                                                                   | `J.intersect(J.partial({ foo: J.number }), J.type({ bar: J.string }))` |
| sum        | Takes in a tag and a record of `JsonSchema` that each contain a key with tag as the name and returns a union of the members   | `J.sum('myTag', { foo: J.type({ myTag: J.literal('foo') })})`          |
| lazy       | Takes in a key and a function that returns a JsonSchema and returs a Json Schema `$ref`                                       | `J.lazy('Foo', () => J.type({ foo: J.string }))`                       |
| print      | Takes in a `JsonSchema<A>` and returns the actual Json Schema representation                                                  | `J.print(J.string)`                                                    |

### Modules

`Schemable` is a type from [fun schemable](https://deno.land/x/fun/schemable/schemable.ts) that abstracts the combinator pattern used in `jsonschema.ts`. Effectively, instead of using jsonschema.ts combinators directly, one can define a `Schemable` instance using the `make` function from `hkts schemable` and then derive the actual json schema from that.
