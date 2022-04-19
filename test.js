import assert from 'assert'
import path from 'path'

// Unified
import { rehype } from 'rehype'

// Plugin
import modules from './index.js'

describe('rehype-css-modules', () => {
  const defaultModule = {
    one: 'two',
    scoped: '_scoped',
    nested: {
      container: 'some-container',
    },
  }

  const run = (file, options = {}) => rehype()
    .data('settings', { fragment: true })
    .use(modules, { module: defaultModule, ...options })
    .process(file)
    .then(result => result.value)

  const test = async (source, expected, options) => {
    const received = await run(source, options)
    assert.equal(received, expected)
  }

  it('replaces classes by default, skips non-replaceable', async () => {
    const source = '<div class="one tree"></div>'
    const expected = '<div class="two tree"></div>'
    await test(source, expected)
  })

  it('supports custom property and deletes it by default', async () => {
    const source = '<div class="tree" css-module="one"></div>'
    const expected = '<div class="tree two"></div>'
    await test(source, expected, { property: 'css-module' })
  })

  it('supports multiple values in a custom property', async () => {
    const source = '<div class="tree" css-module="scoped one"></div>'
    const expected = '<div class="tree _scoped two"></div>'
    await test(source, expected, { property: 'css-module' })
  })

  it('allows to keep the custom property', async () => {
    const source = '<div class="tree" css-module="scoped one"></div>'
    const expected = '<div class="tree _scoped two" css-module="scoped one"></div>'
    const options = { property: 'css-module', keepProperty: true }
    await test(source, expected, options)
  })

  // NOTE: Can be reconsidered
  it('ignores missing module paths', async () => {
    const source = '<div class="tree" css-module="one missing"></div>'
    const expected = '<div class="tree two"></div>'
    await test(source, expected, { property: 'css-module' })
  })

  it('supports nested modules', async () => {
    const source = '<div class="nested.container"></div>'
    const expected = '<div class="some-container"></div>'
    await test(source, expected)
  })
})
