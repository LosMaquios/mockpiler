import {
  MockContextAccessor,
  MockContext,
  unknownIdent
} from '../src'

export const customContextAccessor: MockContextAccessor = key => {
  return key !== 'unknown'
    ? key
    : unknownIdent
}

export const validContext: MockContext = {
  name: 'Test',
  age () {
    return 40
  },
  person () {
    return {
      name: this.name,
      age: this.age()
    }
  },
  people () {
    return [
      this.person(),
      this.person()
    ]
  }
}

export const validCode = `
  {
    name
    age
    '{complex-key-braces}': name
    '[complex-key-brackets]': age
    matches: [
      person
      ...people
      (3) {
        name
        age
      }
    ]
  }
`

export const unknownTokenCode = `
  {
    test,
  }
`

export const invalidTokenCode = `
  {
    test]
  }
`
