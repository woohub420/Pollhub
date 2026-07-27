// Simple English singularizer to prevent plural duplicates
export function singularize(word) {
  const w = word.toLowerCase().trim()
  if (!w) return w

  // Irregulars
  const irregulars = {
    people: 'person', men: 'man', women: 'woman', children: 'child',
    teeth: 'tooth', feet: 'foot', mice: 'mouse', geese: 'goose',
    oxen: 'ox', knives: 'knife', lives: 'life', wolves: 'wolf',
    leaves: 'leaf', halves: 'half', shelves: 'shelf', loaves: 'loaf',
  }
  if (irregulars[w]) return irregulars[w]

  // Rules (order matters)
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y' // babies → baby
  if (w.endsWith('ves') && w.length > 4) return w.slice(0, -3) + 'f' // leaves → leaf
  if (w.endsWith('ses') || w.endsWith('xes') || w.endsWith('zes') || w.endsWith('ches') || w.endsWith('shes'))
    return w.slice(0, -2) // buses → bus
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1) // cars → car

  return w
}

export function slugify(name) {
  return singularize(name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
}
