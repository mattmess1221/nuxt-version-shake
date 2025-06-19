export function logErrorOnBuild(): never {
  throw new Error('This is a test macro that fails the build.')
}
