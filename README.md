# JsonSchema for Deno

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

There is also an export of a Schemable for use with [hkts](https://deno.land/x/hkts).
If you use the hkts Schemable `make` function to create a `Schemable` you can use
that to generate a jsonschema as well.

```ts
import * as J from "https://deno.land/x/jsonschema/jsonschema.ts";
import * as S from "https://deno.land/x/hkts/schemable.ts";

/**
 * Declare the type using json_schema combinators
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
a `Schemable` can also be used to generate an hkts [decoder](https://deno.land/x/hkts/decoder.ts).
