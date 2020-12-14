type CloneFn = <T extends object>(obj: T) => T

export const shallowClone: CloneFn = obj => ({
  ...obj
})

export const deepClone: CloneFn = obj => (
  JSON.parse(
    JSON.stringify(
      obj
    )
  )
)
