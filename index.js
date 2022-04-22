import clone from 'lodash.clonedeep'
import merge from 'lodash.merge'
import postcss from 'rehype-postcss'
import postcssModules from 'postcss-modules'
import { hasProperty } from 'hast-util-has-property'
import { visitParents as visit } from 'unist-util-visit-parents'
import apply from './lib/apply-module.js'

const testCompiled = node => node.data?.exports?.['postcss-modules'] != null
const testNotCompiled = node => !testCompiled(node)

const useCompiler = (processor, flag, pluginOptions, postcssOptions) => {
  if (flag === false || flag === 'none') return processor

  const options = Object.assign({
    // Some convenience by default
    localsConvention: 'camelCase',

    // Prevent writing `*.json` files next to HTML files
    getJSON: () => {},
  }, pluginOptions || {})

  const test = flag === 'all' || flag === true
    ? testNonCompiled
    : node => testNotCompiled(node) && hasProperty(node, 'module') // 'auto'

  return processor.use(postcss, {
    test,
    plugins: [postcssModules(options)],
    options: postcssOptions,
  })
}

const exporter = () => tree => {
  visit(tree, testCompiled, node => {
    const scope = node.properties.module ?? ''
    const module = node.data.exports['postcss-modules']

    Object.assign(node.data, {
      module: scope ? { [scope]: module } : module,
    })
  })
}

const transformer = ({
  module: userGlobalModule = {},
  property = 'className',
  keepProperty = false,
  scopeAll = false,
} = {}) => tree => {
  const globalModule = clone(userGlobalModule)
  if (!scopeAll) {
    visit(tree, testCompiled, node => {
      merge(globalModule, node.data.module)
    })
  }

  const context = [globalModule]
  const testScoped = scopeAll
    ? testCompiled
    : node => testCompiled(node) && hasProperty(node, 'scoped')

  visit(tree, testScoped, (node, ancestors) => {
    context.length = ancestors.length
    context.push(node.data.module)

    const parent = ancestors[ancestors.length - 1]
    const currentModule = merge({}, ...context)
    apply(parent, currentModule, { property, keepProperty })
  })

  apply(tree, globalModule, { property, keepProperty })
}

function attach({
  compile: cssModulesOptions = true,
  postcssOptions,
  ...transformerOptions
} = {}) {
  useCompiler(this, 'auto', cssModulesOptions, postcssOptions)
    .use(exporter)
    .use(transformer, transformerOptions)
}

export default attach
