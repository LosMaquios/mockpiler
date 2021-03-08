> ❗❗❗ IMPORTANT ❗❗❗
> 
> _Development will continue in [this repo](https://github.com/mockpiler/mockpilerjs)_
> 
> _This repo will be archived as soon as the migration completes_

# MockPiler

![Build and test workflow badge](https://github.com/LosMaquios/mockpiler/workflows/Build%20and%20test/badge.svg)

  Generate mock data using a dead simple JSON-like language.

  **Support:** It should work for any JavaScript runtime like `Deno`, `Node.js` and `browsers`.

## Installation

```bash
$ npm install @mockpiler/core

# using yarn

$ yarn add @mockpiler/core
```

## Example

```ts
import mock from '@mockpiler/core'

const context = {
  name: 'John Doe',
  randomAge () {
    return Math.floor(Math.random() * 100)
  },
  randomFruit () {
    const fruits = [
      'watermelon',
      'strawberry',
      'pineapple',
      'apple'
    ]

    return fruits[Math.floor(Math.random() * fruits.length)]
  }
}

const people = mock(context)`
  [
    (2) {
      name
      age: randomAge
      favoriteFruits: [
        (3) randomFruit
      ]
    }
  ]
`

// or using interpolation

const people = mock`
  [
    (2) {
      name: ${context.name}
      age: ${context.randomAge}
      favoriteFruits: [
        (3) ${context.randomFruit}
      ]
    }
  ]
`

console.log(people)

/**
 * Example output:
 * 
 * [
 *   {
 *     name: 'John Doe',
 *     age: 33,
 *     favoriteFruits: [
 *       'watermelon',
 *       'pineapple',
 *       'apple'
 *     ]
 *   },
 *   {
 *     name: 'John Doe',
 *     age: 56,
 *     favoriteFruits: [
 *       'strawberry',
 *       'pineapple',
 *       'apple'
 *     ]
 *   }
 * ]
 */
```

## API Docs

  *TODO*

## Syntax

### Object

```
object :=
  { 
    <identifier> | <identifier>: <identifier> | <array> | <object> | <spread>* 
  }
```

### Array

```
array :=
  [
    [ ( <count> ) ] <identifier> | <object> | <array> | <spread>*
  ]
```

### Identifier

```
start-identifier-char :=
  a-z | _

left-identifier-char :=
  <start-identifier-char> | - | .

identifier :=
  <start-chart>[ <left-identifier>* ]
```

### Count

```
count :=
  1-9[ 0-9* ]
```

### Spread

```
spread :=
  ...<identifier>
```
