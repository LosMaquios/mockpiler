import fake from '../src'

test('should compile with fake data', () => {
  const result: { name: string, locale: string } = fake`
    {
      name: findName
      locale
    }
  ` as any

  expect(typeof result.name).toBe('string')
  expect(typeof result.locale).toBe('string')
})