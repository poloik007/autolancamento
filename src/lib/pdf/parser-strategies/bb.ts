import type { ParserStrategy } from './index'
import type { RawTransaction } from '../normalizer'
import { generic } from './generic'

const HEADER = /Banco\s+do\s+Brasil|bb\.com\.br/i

export const bb: ParserStrategy = {
  canHandle(text: string): boolean {
    return HEADER.test(text)
  },
  parse(text: string): RawTransaction[] {
    return generic.parse(text)
  },
}
