const files = import.meta.glob<string>('./*/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** The stylesheet text of one shared component, by folder name. Empty if there is none. */
export const cssOf = (component: string) =>
  Object.entries(files).find(([path]) => path.includes(`/${component}/`))?.[1] ?? ''
