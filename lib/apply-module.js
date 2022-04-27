import get from 'lodash.get'
import { hasProperty } from 'hast-util-has-property'
import { visitParents as visit } from 'unist-util-visit-parents'

const resplit = classList => classList.flatMap(s => s.split(/\s+/g))

const postprocess = (classList, { split = false } = {}) => {
  if (split) return resplit(classList)
  return classList
}

const apply = (tree, module, options = {}) => {
  const {
    property = 'className',
    keepProperty = false,
    splitComposed = true,
  } = options

  const test = node => hasProperty(node, property)
  const visitor = node => {
    if (property === 'className') {
      const classList = node.properties.className
        .map(name => get(module, name, name))
      const className = postprocess(classList, { split: splitComposed })

      Object.assign(node.properties, { className })
      return
    }

    const classList = node.properties.className ?? []
    const moduleNames = Array.isArray(node.properties[property])
      ? node.properties[property]
      : node.properties[property].split(/\s+/g)

    moduleNames.forEach(name => {
      const newName = get(module, name)
      if (newName != null) {
        classList.push(newName)
      }
    })

    const className = postprocess(classList, { split: splitComposed })

    Object.assign(node.properties, { className })

    if (!keepProperty) {
      delete node.properties[property]
    }
  }

  visit(tree, test, visitor)
}

export default apply
