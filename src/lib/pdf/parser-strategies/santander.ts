import type { ParserStrategy } from './index'
import type { RawTransaction } from '../normalizer'
import { generic } from './generic'

const HEADER = /Santander/i

export const santander: ParserStrategy = {
  canHandle(text: string): boolean {
    return HEADER.test(text)
  },
  parse(text: string): RawTransaction[] {
    return generic.parse(text)
  },
}
