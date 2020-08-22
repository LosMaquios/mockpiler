export const validContext = {
  name: 'Test',
  age () {
    return 40
  },
  person () {
    return {
      name: validContext.name,
      age: validContext.age()
    }
  }
}

export const validCode = `
  {
    name
    age
    matches: [
      person
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
