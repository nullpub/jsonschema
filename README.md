# JsonSchema for Deno

A library for constructing JsonSchemas and TypeScript types simultaneously.

## Usage

This library is a collection of combinators that can be used to construct
json schemas and their associated TypeScript types at the same time. It follows
the pattern laid down by gcanti in io-ts. Following is the simple usage case:

```ts
import * as J from "https://deno.land/x/json_schema/json_schema.ts";

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
console.log(JSON.stringify(J.print(MyType), null, 2));
```
