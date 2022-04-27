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

  const makeOptions = ({ compile = true, module, ...restOptions } = {}) => ({
    // redefining for testing sanity (white box)
    compile: compile === true ? { generateScopedName: '_[local]' } : compile,
    module: module ?? defaultModule,
    ...restOptions,
  })

  const makeProcessor = options => rehype()
    .data('settings', {
      fragment: true,
      collapseEmptyAttributes: true,
    })
    .use(modules, makeOptions(options))

  const run = (file, options) => makeProcessor(options)
    .process(file)
    .then(result => result.value)

  const test = async (source, expected, options) => {
    const received = await run(source, options)
    assert.strictEqual(received, expected)
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

  // NOTE: Can be reconsidered.
  //       If you prefer throwing, send an issue or PR 😉
  it('ignores missing module paths', async () => {
    const source = '<div class="tree" css-module="one missing"></div>'
    const expected = '<div class="tree two"></div>'
    await test(source, expected, { property: 'css-module' })
  })

  // NOTE: This make dots to be treated as nesting always
  //       according to my understanding of lodash.get
  it('supports nested modules', async () => {
    const source = '<div class="nested.container"></div>'
    const expected = '<div class="some-container"></div>'
    await test(source, expected)
  })

  it('compiles and applies styles with a module reference', async () => {
    const source = `
      <style module>.local { color: red }</style>
      <style>.global { color: blue }</style>
      <div class="local global"></div>
    `
    // cannot avoid `=""` as compiler set up in this way by default
    const expected = `
      <style module>._local { color: red }</style>
      <style>.global { color: blue }</style>
      <div class="_local global"></div>
    `
    await test(source, expected)
  })

  // It looks shitty due to implementation but in the real case scenario
  // name collision should never happen when [hash] is used.
  //
  // I might find a good default
  // but this means I have to customize defaults
  // which are not expected to be changed
  it('supports module names', async () => {
    const source = `
      <style module>.local { color: red }</style>
      <style module="a">.local { color: green }</style>
      <style module="b">.local { color: blue }</style>
      <div class="local a.local b.local"></div>
    `
    const expected = `
      <style module>._local { color: red }</style>
      <style module="a">._local { color: green }</style>
      <style module="b">._local { color: blue }</style>
      <div class="_local _local _local"></div>
    `
    await test(source, expected)
  })

  it('hoists global (not scoped) modules by default', async () => {
    const source = `
      <div class="local global">
        <div>
          <style module>.local { color: #000 }</style>
        </div>
      </div>
    `
    const expected = `
      <div class="_local global">
        <div>
          <style module>._local { color: #000 }</style>
        </div>
      </div>
    `
    await test(source, expected)
  })

  it('allows to disable module hoisting', async () => {
    const source = `
      <div class="local global">
        <div class="local global">
          <style module>.local { color: #000 }</style>
          <div class="local global"></div>
        </div>
      </div>
    `
    const expected = `
      <div class="local global">
        <div class="_local global">
          <style module>._local { color: #000 }</style>
          <div class="_local global"></div>
        </div>
      </div>
    `
    await test(source, expected, { scopeAll: true })
  })

  // NOTE: Scoped styles are applied to parent due to the implementation.
  //       I am not sure if this is a correct and expected behavior
  //       and could change this if get an advice about.
  it('supports scoping', async () => {
    const source = `
      <div class="local global">
        <div class="local global">
          <style scoped module>.local { color: #000 }</style>
          <div class="local global"></div>
        </div>
      </div>
    `
    const expected = `
      <div class="local global">
        <div class="_local global">
          <style scoped module>._local { color: #000 }</style>
          <div class="_local global"></div>
        </div>
      </div>
    `
    await test(source, expected)
  })

  it('splits composed class names internally', async () => {
    const source = '<div class="a"></div>'
    const module = { a: '_a _b' } // .a { composes: b }
    const expectedClassName = ['_a', '_b']

    const processor = makeProcessor({ module })
    const receivedTree = await processor.run(processor.parse(source))
    const receivedClassName = receivedTree.children[0].properties.className

    assert.deepEqual(receivedClassName, expectedClassName)
  })
})
