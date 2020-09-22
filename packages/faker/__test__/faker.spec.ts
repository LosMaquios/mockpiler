import fake from '../src'

test('should compile with fake data', () => {
  const result: { name: string, locale: string } = fake`
    {
      name: findName
      locale
    }
  ` as any

  expect(result.name).toMatch(/[A-Z][a-z]+\s[A-Z][a-z]+/)
  expect(typeof result.locale).toBe('string')
})