export {}

if (process.env.NODE_ENV === 'production') {
  console.log('Postinstall script skipped in production mode.')
  process.exit(0)
}

console.log(await Bun.$`biome migrate --write`.text())
