import { Bounds, View } from 'ept'
import { Reproject } from 'utils'

export type Addon = [string, string]
export type Addons = Addon[]
export type Options = {
  ept?: string
  zOffset: number
  dimensions: string[]
  addons: Addons
  truncate: boolean
}

export type Params = {
  view: View.Readable
  tileBounds: Bounds
  toEcef: Reproject
  options: Partial<Options>
}


export type Header = {
  Cookie: string
}
export type RequestOptions = {
    headers: Header
}
