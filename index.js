import get from 'lodash.get'
import merge from 'lodash.merge'
import { visitParents as visit } from 'unist-util-visit-parents'

const apply = (tree, module, options = {} ) => {
  const { property = 'className', keepProperty = false } = options

  const test = node => node.type == 'element' && node.properties?.[property]
  const visitor = node => {
    if (property === 'className') {
      const className = node.properties.className
        .map(name => get(module, name, name))

      Object.assign(node.properties, { className })
      return
    }

    const className = node.properties.className ?? []
    const moduleNames = Array.isArray(node.properties[property])
      ? node.properties[property]
      : node.properties[property].split(/\s+/g)

    moduleNames.forEach(name => {
      const newName = get(module, name)
      if (newName != null) {
        className.push(newName)
      }
    })

    Object.assign(node.properties, { className })

    if (!keepProperty) {
      delete node.properties[property]
    }
  }

  visit(tree, test, visitor)
}

const attach = ({
  module: globalModule = {},
  property = 'className',
  keepProperty = false,
} = {}) => {
  const transform = async (tree, file) => {
    const context = [globalModule]
    const currentModule = merge({}, ...context)

    apply(tree, currentModule, { property, keepProperty })
  }

  return transform
}

export default attach
